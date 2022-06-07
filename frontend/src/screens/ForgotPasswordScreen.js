import Axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Helmet } from 'react-helmet-async';
import { useContext, useEffect, useState} from 'react';
import { Store } from '../Store';
import { toast } from 'react-toastify';
import { getError } from '../utils';
function ForgotPasswordScreen() {
    
  const navigate = useNavigate();
  const { search } = useLocation();
  const redirectInUrl = new URLSearchParams(search).get('redirect');
  const redirect = redirectInUrl ? redirectInUrl : '/';

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');


  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;
  const submitHandler = async (e) => {
    e.preventDefault();
    if (otp ==='') {
        toast.error('Please enter the OTP');
        return;
      }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
        console.log(email);
       await Axios.post('/api/users/changePassword', {
        email:email,
        password:password,
        otp:otp,
      }).then((res)=>{
          if(res.data.message==='Invalid OTP'){
            toast.error("Invalid OTP");

          }
          else{
              const data = res.data;
              console.log(data);
            ctxDispatch({ type: 'USER_SIGNIN', payload: data });
            localStorage.setItem('userInfo', JSON.stringify(data));
                  navigate(redirect || '/');

          }
          
      });
     
    } catch (err) {
      toast.error(getError(err));
    }
  };

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, userInfo]);
function getotp()
{
    console.log(email);
    if(email ===''){
        toast.error("Email is Required");
    }
    else
    {
    try {
        Axios.post('/api/users/forgotcheck',{email:email}).then((res=>{
            console.log(res);
            if(res.data.message==='Email not Registered'){
                toast.error('Email not Registered');

            }
        }));

    } catch (err) {
      toast.error(getError(err));
    }

    }
}
  return (
<Container className="small-container">
      <Helmet>
        <title>Forgot Password</title>
      </Helmet>
      <h1 className="my-3">Forgot Password</h1>
      <Form onSubmit={submitHandler}>
        <Form.Group className="mb-3" controlId="email">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </Form.Group>
        <div className="mb-3">
          <Button  onClick={(e) => {getotp()}}>Get OTP</Button>
        </div>
        <Form.Group className="mb-3" controlId="password">
          <Form.Label>OTP</Form.Label>
          <Form.Control
            required
            onChange={(e) => setOtp(e.target.value)}
          />
                    </Form.Group>

        
                    <Form.Group className="mb-3" controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            required
            onChange={(e) => setPassword(e.target.value)}
          />
                    </Form.Group>

          <Form.Group className="mb-3" controlId="confirmPassword">
            <Form.Label>Confirm Password</Form.Label>
            <Form.Control
              type="password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Form.Group>
        <div className="mb-3">
          <Button type="submit">Sign In</Button>
        </div>
        
      </Form>
    </Container>
  )
}

export default ForgotPasswordScreen