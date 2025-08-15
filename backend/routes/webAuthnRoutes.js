 ```javascript
 const express = require('express');
 const router = express.Router();
 const User = require('../models/user');
 const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');
 const { protect } = require('../middleware/authMiddleware');

 const rpID = 'etafanta.com'; // Your domain name
 const origin = `https://${rpID}`;

 // Route to generate options for registering a new fingerprint/passkey
 router.post('/register/start', protect, async (req, res) => {
     const user = await User.findById(req.user.id);
     if (!user) return res.status(404).json({ message: 'User not found' });

     const options = await generateRegistrationOptions({
         rpName: 'Eta Fanta',
         rpID,
         userID: user.id,
         userName: user.phone,
         attestationType: 'none',
         authenticatorSelection: { userVerification: 'preferred', residentKey: 'required' }
     });

     user.currentChallenge = options.challenge;
     await user.save();

     res.json(options);
 });

 // Route to verify the device's response after a registration
 router.post('/register/finish', protect, async (req, res) => {
     const user = await User.findById(req.user.id);
     if (!user) return res.status(404).json({ message: 'User not found' });

     try {
         const verification = await verifyRegistrationResponse({
             response: req.body,
             expectedChallenge: user.currentChallenge,
             expectedOrigin: origin,
             expectedRPID: rpID,
         });

         if (verification.verified) {
             user.authenticators.push(verification.registrationInfo);
             user.currentChallenge = undefined;
             await user.save();
         }

         res.json({ verified: verification.verified });
     } catch (error) {
         console.error(error);
         return res.status(400).json({ error: error.message });
     }
 });

 // Route to generate options for logging in with a fingerprint/passkey
 router.post('/login/start', async (req, res) => {
     const { phone } = req.body;
     const user = await User.findOne({ phone });
     if (!user) return res.status(404).json({ message: 'User with this phone not found or has no passkey.' });

     const options = await generateAuthenticationOptions({ rpID, allowCredentials: user.authenticators.map(auth => ({ id: auth.credentialID, type: 'public-key' })) });

     user.currentChallenge = options.challenge;
     await user.save();

     res.json(options);
 });

 // Route to verify the device's response after a login attempt
 router.post('/login/finish', async (req, res) => {
     const { phone } = req.body;
     const user = await User.findOne({ phone });
     if (!user) return res.status(404).json({ message: 'User not found.' });

     const authenticator = user.authenticators.find(auth => auth.credentialID.toString('base64url') === req.body.id);
     if (!authenticator) return res.status(400).json({ message: 'Authenticator not found.' });

     try {
         const verification = await verifyAuthenticationResponse({
             response: req.body,
             expectedChallenge: user.currentChallenge,
             expectedOrigin: origin,
             expectedRPID: rpID,
             authenticator,
         });

         if (verification.verified) {
             // Login successful, generate a JWT token
             const payload = { user: { id: user.id } };
             const token = require('jsonwebtoken').sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
             user.currentChallenge = undefined;
             await user.save();
             res.json({ verified: true, token, user: { phone: user.phone, balance: user.balance, fullName: user.fullName } });
         } else {
             res.status(400).json({ verified: false, message: 'Verification failed.' });
         }
     } catch (error) {
         console.error(error);
         res.status(400).json({ error: error.message });
     }
 });

 module.exports = router;
 ```