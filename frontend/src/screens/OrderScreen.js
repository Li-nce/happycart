import axios from 'axios';
import React, { useContext, useEffect, useReducer, useState } from 'react';
import { usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Card from 'react-bootstrap/Card';
import { Link } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { Store } from '../Store';
import { getError } from '../utils';
import { toast } from 'react-toastify';
import GooglePayButton from '@google-pay/button-react';

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true, error: '' };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, order: action.payload, error: '' };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'PAY_REQUEST':
      return { ...state, loadingPay: true };
    case 'PAY_SUCCESS':
      return { ...state, loadingPay: false, successPay: true };
    case 'PAY_FAIL':
      return { ...state, loadingPay: false };
    case 'PAY_RESET':
      return { ...state, loadingPay: false, successPay: false };

    case 'DELIVER_REQUEST':
      return { ...state, loadingDeliver: true };
    case 'DELIVER_SUCCESS':
      return { ...state, loadingDeliver: false, successDeliver: true };
    case 'DELIVER_FAIL':
      return { ...state, loadingDeliver: false };
    case 'DELIVER_RESET':
      return {
        ...state,
        loadingDeliver: false,
        successDeliver: false,
      };
    default:
      return state;
  }
}
export default function OrderScreen() {
  const { state } = useContext(Store);
  const { userInfo } = state;

  const params = useParams();
  const [bill, setBill] = useState('');

  const { id: orderId } = params;
  const navigate = useNavigate();

  const [
    {
      loading,
      error,
      order,
      successPay,
      loadingPay,
      loadingDeliver,
      successDeliver,
    },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    order: {},
    error: '',
    successPay: false,
    loadingPay: false,
  });

  const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();

  // function createOrder(data, action) {
  //   // console.log('dfsdfafs' + data);
  //   return action.order.create({
  //       purchase_units: [
  //         {
  //           amount: { value: order.totalPrice },
  //         },
  //       ],
  //     })
  //     .then((orderID) => {
  //       console.log(orderID);
  //       return orderID;
  //     });
  // }

  function onApprove() {
    console.log('approve called');
    console.log('email' + userInfo.email);
    const email = userInfo.email;
    const id = userInfo._id;
    try {
      dispatch({ type: 'PAY_REQUEST' });
      axios
        .put(
          `/api/orders/${order._id}/pay`,
          {
            id: id,
            status: 'Success',
            update_time: String(Date()),
            email: email,
          },
          {
            headers: { authorization: `Bearer ${userInfo.token}` },
          }
        )
        .then((res) => {
          console.log(res.data.bill);
          setBill(res.data.bill);
        });
      dispatch({ type: 'PAY_SUCCESS' });
      toast.success('Order is paid');
      //window.location.reload(false);
    } catch (err) {
      dispatch({ type: 'PAY_FAIL', payload: getError(err) });
      toast.error(getError(err));
    }
  }

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/orders/${orderId}`, {
          headers: { authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };

    if (!userInfo) {
      return navigate('/login');
    }
    if (
      !order._id ||
      successPay ||
      successDeliver ||
      (order._id && order._id !== orderId)
    ) {
      fetchOrder();
      if (successPay) {
        dispatch({ type: 'PAY_RESET' });
      }
      if (successDeliver) {
        dispatch({ type: 'DELIVER_RESET' });
      }
    } else {
    }
  }, [
    order,
    userInfo,
    orderId,
    navigate,
    paypalDispatch,
    successPay,
    successDeliver,
  ]);

  async function deliverOrderHandler() {
    try {
      dispatch({ type: 'DELIVER_REQUEST' });
      const { data } = await axios.put(
        `/api/orders/${order._id}/deliver`,
        {},
        {
          headers: { authorization: `Bearer ${userInfo.token}` },
        }
      );
      dispatch({ type: 'DELIVER_SUCCESS', payload: data });
      toast.success('Order is delivered');
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'DELIVER_FAIL' });
    }
  }
  console.log(bill);
  return loading ? (
    <LoadingBox></LoadingBox>
  ) : error ? (
    <MessageBox variant="danger">{error}</MessageBox>
  ) : (
    <div>
      <div id="non-printable">
        <Helmet>
          <title>Order {orderId}</title>
        </Helmet>
        <h1 className="my-3">Order {orderId}</h1>
        <Row>
          <Col md={8}>
            <Card className="mb-3">
              <Card.Body>
                <Card.Title>Shipping</Card.Title>
                <Card.Text>
                  <strong>Name:</strong> {order.shippingAddress.fullName} <br />
                  <strong>Address: </strong> {order.shippingAddress.address},
                  {order.shippingAddress.city},{' '}
                  {order.shippingAddress.postalCode}
                </Card.Text>
                {order.isDelivered ? (
                  <MessageBox variant="success">
                    Delivered at {order.deliveredAt}
                  </MessageBox>
                ) : (
                  <MessageBox variant="danger">Not Delivered</MessageBox>
                )}
              </Card.Body>
            </Card>
            <Card className="mb-3">
              <Card.Body>
                <Card.Title>Payment</Card.Title>
                <Card.Text>
                  <strong>Method:</strong> {order.paymentMethod}
                </Card.Text>
                {order.isPaid ? (
                  <MessageBox variant="success">
                    Paid at {order.paidAt}
                  </MessageBox>
                ) : (
                  <MessageBox variant="danger">Not Paid</MessageBox>
                )}
              </Card.Body>
            </Card>

            <Card className="mb-3">
              <Card.Body>
                <Card.Title>Items</Card.Title>
                <ListGroup variant="flush">
                  {order.orderItems.map((item) => (
                    <ListGroup.Item key={item._id}>
                      <Row className="align-items-center">
                        <Col md={6}>
                          <img
                            src={item.image}
                            alt={item.name}
                            className="img-fluid rounded img-thumbnail"
                          ></img>{' '}
                          <Link to={`/product/${item.slug}`}>{item.name}</Link>
                        </Col>
                        <Col md={3}>
                          <span>{item.quantity}</span>
                        </Col>
                        <Col md={3}>₹{item.price}</Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="mb-3">
              <Card.Body>
                <Card.Title>Order Summary</Card.Title>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <Row>
                      <Col>Items</Col>
                      <Col>₹{order.itemsPrice.toFixed(2)}</Col>
                    </Row>
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <Row>
                      <Col>Tax</Col>
                      <Col>₹{order.taxPrice.toFixed(2)}</Col>
                    </Row>
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <Row>
                      <Col>
                        <strong> Order Total</strong>
                      </Col>
                      <Col>
                        <strong>₹{order.totalPrice.toFixed(2)}</strong>
                      </Col>
                    </Row>
                  </ListGroup.Item>
                  {!order.isPaid && order.user === userInfo._id && (
                    <ListGroup.Item>
                      {isPending ? (
                        <LoadingBox />
                      ) : (
                        <div>
                          <div className="App">
                            <GooglePayButton
                              environment="TEST"
                              paymentRequest={{
                                apiVersion: 2,
                                apiVersionMinor: 0,
                                allowedPaymentMethods: [
                                  {
                                    type: 'CARD',
                                    parameters: {
                                      allowedAuthMethods: [
                                        'PAN_ONLY',
                                        'CRYPTOGRAM_3DS',
                                      ],
                                      allowedCardNetworks: [
                                        'MASTERCARD',
                                        'VISA',
                                      ],
                                    },
                                    tokenizationSpecification: {
                                      type: 'PAYMENT_GATEWAY',
                                      parameters: {
                                        gateway: 'example',
                                        gatewayMerchantId:
                                          'exampleGatewayMerchantId',
                                      },
                                    },
                                  },
                                ],
                                merchantInfo: {
                                  merchantId: '12345678901234567890',
                                  merchantName: 'HappyCart Merchant',
                                },
                                transactionInfo: {
                                  totalPriceStatus: 'FINAL',
                                  totalPriceLabel: 'Total',
                                  totalPrice: String(order.totalPrice),
                                  currencyCode: 'INR',
                                  countryCode: 'IN',
                                },
                                shippingAddressRequired: true,
                                callbackIntents: ['PAYMENT_AUTHORIZATION'],
                              }}
                              onLoadPaymentData={(paymentRequest) => {
                                //createOrder();
                                onApprove();

                                console.log('Success', paymentRequest);
                              }}
                              onPaymentAuthorized={(paymentData) => {
                                console.log(
                                  'Payment Authorised Success',
                                  paymentData
                                );
                                return { transactionState: 'SUCCESS' };
                              }}
                              existingPaymentMethodRequired="false"
                              buttonColor="black"
                              buttonType="Buy"
                            />
                          </div>
                          {/* <PayPalButtons
                          createOrder={createOrder}
                          onApprove={onApprove}
                          onError={onError}
                        ></PayPalButtons> */}
                        </div>
                      )}
                      {loadingPay && <LoadingBox></LoadingBox>}
                    </ListGroup.Item>
                  )}

                  {userInfo.isDeliveryAgent &&
                    order.isPaid &&
                    !order.isDelivered && (
                      <ListGroup.Item>
                        {loadingDeliver && <LoadingBox></LoadingBox>}
                        <div className="d-grid">
                          <Button type="button" onClick={deliverOrderHandler}>
                            Deliver Order
                          </Button>
                        </div>
                      </ListGroup.Item>
                    )}
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
      {order.isPaid ? (
        <div>
          <div className="invoice-box">
            <table cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr className="top">
                  <td colSpan={2}>
                    <table>
                      <tbody>
                        <tr>
                          <td className="title">HAPPYCART</td>
                          <td></td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr className="information">
                  <td colSpan={2}>
                    <table>
                      <tbody>
                        <tr>
                          <td>
                            {order.shippingAddress.fullName &&
                              order.shippingAddress.fullName}
                            <br />
                            {order.shippingAddress.address &&
                              order.shippingAddress.address}
                            <br />
                            {order.shippingAddress.postalCode &&
                              order.shippingAddress.postalCode}
                          </td>
                          <td></td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    {/* Invoice #: 123 */}
                    <br />
                    Created: {order.createdAt.toString().substring(0, 10)}
                    <br />
                    {/* Due: February 1, 2015 */}
                  </td>
                </tr>
                <tr>
                  <td>
                    {/* Invoice #: 123 */}
                    <br />
                    <b> ORDER ID: {order._id}</b>
                    <br />
                    {/* Due: February 1, 2015 */}
                  </td>
                </tr>

                <tr className="heading">
                  <td>Products</td>
                  <td></td>
                  <td>Quantity</td>
                  <td>Price</td>
                </tr>
                {order.orderItems.map((item) => (
                  <>
                    <tr>
                      <td> {item.name}</td>
                      <td></td>

                      <td>{item.quantity}</td>
                      <td>₹{item.price}</td>
                    </tr>
                    <tr className="heading"></tr>
                  </>
                ))}

                <tr className="heading">
                  <td>Total Price</td>
                  <td></td>

                  <td></td>
                  <td>₹{order.totalPrice}</td>
                </tr>
                <tr className="heading">
                  <td>Payment Method</td>
                  <td></td>

                  <td></td>
                  <td>GooglePay</td>
                </tr>
                <br></br>
                <tr>Thank you for choosing HappyCart.</tr>
              </tbody>
            </table>
          </div>
          <div id="non-printable">
            <Button
              onClick={() => {
                window.print();
              }}
            >
              Print Bill
            </Button>
          </div>
        </div>
      ) : (
        'jk'
      )}
    </div>
  );
}
