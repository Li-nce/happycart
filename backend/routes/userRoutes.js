import express from 'express';
import bcrypt from 'bcryptjs';
import expressAsyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import { isAuth, isAdmin, generateToken } from '../utils.js';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';

const userRouter = express.Router();

userRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const users = await User.find({});
    res.send(users);
  })
);

userRouter.get(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      res.send(user);
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);

userRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.isAdmin = Boolean(req.body.isAdmin);
      user.isDeliveryAgent = Boolean(req.body.isDeliveryAgent);
      const updatedUser = await user.save();
      res.send({ message: 'User Updated', user: updatedUser });
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);

userRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      if (user.email === 'admin@happycart.com') {
        res.status(400).send({ message: 'Can Not Delete Admin User' });
        return;
      }
      await user.remove();
      res.send({ message: 'User Deleted' });
    } else {
      res.status(404).send({ message: 'User Not Found' });
    }
  })
);
userRouter.post(
  '/signin',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      if (bcrypt.compareSync(req.body.password, user.password)) {
        res.send({
          _id: user._id,
          name: user.name,
          address: user.address,
          postalCode: user.postalCode,
          city: user.city,
          email: user.email,
          isAdmin: user.isAdmin,
          isDeliveryAgent: user.isDeliveryAgent,
          token: generateToken(user),
        });
        return;
      }
    }
    res.status(401).send({ message: 'Invalid email or password' });
  })
);

userRouter.post(
  '/signup',
  expressAsyncHandler(async (req, res) => {
    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      address: req.body.address,
      city: req.body.city,
      postalCode: req.body.postalCode,
      password: bcrypt.hashSync(req.body.password),
    });
    const user = await newUser.save();
    res.send({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isDeliveryAgent: user.isDeliveryAgent,
      address: user.address,
      city: user.city,
      postalCode: user.postalCode,
      token: generateToken(user),
    });
  })
);
userRouter.post(
  '/changePassword',
  expressAsyncHandler(async (req, res) => {
    console.log(req.body);
    const email = req.body.email;
    const password = bcrypt.hashSync(req.body.password);
    const otp = req.body.otp;
    const user = await User.findOne({ email: email });
    if (user) {
      console.log(user.otp);
      console.log(otp);
      if (user.otp === Number(otp)) {
        // console.log("otp match")
        await User.findOneAndUpdate({ email: email }, { password: password });
        res.send({
          _id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          isDeliveryAgent: user.isDeliveryAgent,
          address: user.address,
          city: user.city,
          postalCode: user.postalCode,
          token: generateToken(user),
        });
      } else {
        res.send({ message: 'Invalid OTP' });
        return;
      }
    }
  })
);
userRouter.post(
  '/forgotcheck',
  expressAsyncHandler(async (req, res) => {
    console.log(req.body);
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const val = Math.floor(1000 + Math.random() * 9000);
      await User.findOneAndUpdate({ email: req.body.email }, { otp: val });
      const emailMessage = '<h1>Your OTP is ' + val + '</h1>';
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
              subject: 'OTP for password reset',
              text: 'OTP for password reset',
              html: emailMessage,
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
      // res.status(404).send({ message: 'Email not Registered' });
    } else {
      res.send({ message: 'Email not Registered' });
    }
  })
);
userRouter.put(
  '/profile',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.password) {
        user.password = bcrypt.hashSync(req.body.password, 8);
      }

      const updatedUser = await user.save();
      res.send({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,

        token: generateToken(updatedUser),
      });
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  })
);

export default userRouter;
