// src/pages/VerifyPhone.jsx
import React, { useState } from 'react';
import firebase from 'firebase/app';
import 'firebase/auth';
import '../styles/VerifyPhone.css'; // Optional, for component-specific styling

const PhoneAuth = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState(null);

  const handleSendOtp = async () => {
    try {
      const recaptcha = new firebase.auth.RecaptchaVerifier('recaptcha-container');
      const confirmation = await firebase.auth().signInWithPhoneNumber(phoneNumber, recaptcha);
      setVerificationId(confirmation.verificationId);
      alert('OTP sent!');
    } catch (error) {
      console.error('Error sending OTP:', error.message);
      alert(error.message);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const credential = firebase.auth.PhoneAuthProvider.credential(verificationId, otp);
      const result = await firebase.auth().signInWithCredential(credential);
      const token = await result.user.getIdToken();

      const response = await fetch('http://localhost:5000/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, token }),
      });

      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.error('Error verifying OTP:', error.message);
      alert(error.message);
    }
  };

  return (
    <div>
      <h2>Phone Number Verification</h2>
      <input
        type="text"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder="Enter phone number"
      />
      <button onClick={handleSendOtp}>Send OTP</button>
      <div id="recaptcha-container"></div>
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
      />
      <button onClick={handleVerifyOtp}>Verify OTP</button>
    </div>
  );
};

export default PhoneAuth;
