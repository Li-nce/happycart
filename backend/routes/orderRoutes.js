import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import { isAuth, isAdmin, payOrderEmailTemplate } from '../utils.js';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';

const orderRouter = express.Router();

orderRouter.get(
  '/',
  isAuth,
  isAdmin,

  expressAsyncHandler(async (req, res) => {
    // console.log(req);
    const orders = await Order.find().populate('user', 'name');
    res.send(orders);
  })
);

orderRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    //  console.log(req.body);
    var orderItems = req.body.orderItems.map((x) => ({ ...x, product: x._id }));
    const newOrder = new Order({
      orderItems: req.body.orderItems.map((x) => ({ ...x, product: x._id })),
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      itemsPrice: req.body.itemsPrice,
      taxPrice: req.body.taxPrice,
      totalPrice: req.body.totalPrice,
      user: req.user._id,
    });
    orderItems.map((val) => {
      Product.updateOne(
        { _id: val._id },
        { countInStock: val.countInStock - val.quantity },
        function (err) {
          if (err) {
            console.log(err);
          }
        }
      );
    });
    const order = await newOrder.save();
    res.status(201).send({ message: 'New Order Created', order });
  })
);

orderRouter.get(
  '/summary',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.aggregate([
      {
        $group: {
          _id: null,
          numOrders: { $sum: 1 },
          totalSales: { $sum: '$totalPrice' },
        },
      },
    ]);
    const users = await User.aggregate([
      {
        $group: {
          _id: null,
          numUsers: { $sum: 1 },
        },
      },
    ]);
    const dailyOrders = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          sales: { $sum: '$totalPrice' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const productCategories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);
    res.send({ users, orders, dailyOrders, productCategories });
  })
);

orderRouter.get(
  '/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id });
    res.send(orders);
  })
);

orderRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      res.send(order);
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

orderRouter.put(
  '/:id/deliver',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      await order.save();
      res.send({ message: 'Order Delivered' });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

orderRouter.put(
  '/:id/pay',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'email name'
    );
    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();

      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        bill: payOrderEmailTemplate(order),
        update_time: req.body.update_time,
        email_address: req.body.email,
      };
      const updatedOrder = await order.save();
      try {
        const CLIENT_ID =
          '564403439706-jqec00olc5kic3j7vq74hvakrdk6tm9d.apps.googleusercontent.com';
        const CLEINT_SECRET = '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';
        const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
        const REFRESH_TOKEN =
          '1//04kQC7mHFG07fCgYIARAAGAQSNwF-L9Ir689ZQd-cBwEtJm_GafCMfc9QDFdbXFOr1t9sMmWhMvEynrjdIgf9sDIcmIhUThaGGUk';

        const oAuth2Client = new google.auth.OAuth2(
          CLIENT_ID,
          CLEINT_SECRET,
          REDIRECT_URI
        );
        oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

        async function sendMail() {
          try {
            const accessToken = await oAuth2Client.getAccessToken();

            const transport = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                type: 'OAuth2',
                user: 'lincesalu4@gmail.com',
                clientId: CLIENT_ID,
                clientSecret: CLEINT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken,
              },
            });

            const mailOptions = {
              from: 'Admin HappyCart <lincesalu4@gmail.com>',
              to: String(req.body.email),
              subject: `New order ${order._id}`,
              text: 'order bill',
              html: payOrderEmailTemplate(order),
              // html: '<h1>hello<h1>',
            };

            const result = await transport.sendMail(mailOptions);
            return result;
          } catch (error) {
            return error;
          }
        }
        sendMail()
          .then((result) => console.log('Email sent...', result))
          .catch((error) => console.log(error.message));
      } catch (error) {
        console.log(error);
      }

      // These id's and secrets should come from .env file.
      res.send({
        message: 'Order Paid',
        order: updatedOrder,
        bill: payOrderEmailTemplate(order),
      });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

orderRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      await order.remove();
      res.send({ message: 'Order Deleted' });
    } else {
      res.status(404).send({ message: 'Order Not Found' });
    }
  })
);

export default orderRouter;
