// --- backend/routes/webAuthnRoutes.js --- (FINAL, CORRECTED SYNTAX)

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');
const { protect } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

const rpID = 'etafanta.com';
const expectedOrigin = `https://${rpID}`; // <-- THIS LINE IS NOW CORRECT

// Route to generate options for registering a new fingerprint/passkey
router.post('/register-options', protect, async (req, res) => {
    try {
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
    } catch (error) {
        console.error("WebAuthn Register Options Error:", error);
        res.status(500).json({ message: "Server error generating registration options." });
    }
});

// Route to verify the device's response after a registration
router.post('/verify-registration', protect, async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    try {
        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge: user.currentChallenge,
            expectedOrigin,
            expectedRPID: rpID,
        });

        if (verification.verified && verification.registrationInfo) {
            user.authenticators.push(verification.registrationInfo);
            user.currentChallenge = undefined;
            await user.save();
            res.json({ verified: true });
        } else {
            res.status(400).json({ verified: false, message: 'Could not verify registration.' });
        }
    } catch (error) {
        console.error("WebAuthn Verify Registration Error:", error);
        return res.status(400).json({ error: error.message });
    }
});

// Route to generate options for logging in with a fingerprint/passkey
router.post('/login-options', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: "Phone number is required." });
        
        const user = await User.findOne({ phone, 'authenticators.0': { $exists: true } });
        if (!user) return res.status(404).json({ message: 'User not found or has no passkey registered.' });

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: user.authenticators.map(auth => ({
                id: auth.credentialID,
                type: 'public-key',
                transports: auth.transports,
            })),
        });

        user.currentChallenge = options.challenge;
        await user.save();

        res.json(options);
    } catch (error) {
        console.error("WebAuthn Login Options Error:", error);
        res.status(500).json({ message: "Server error generating login options." });
    }
});

// Route to verify the device's response after a login attempt
router.post('/verify-login', async (req, res) => {
    try {
        const { phone, response } = req.body;
        if (!phone || !response) return res.status(400).json({ message: "Phone number and response are required." });
        
        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const authenticator = user.authenticators.find(auth => auth.credentialID.toString('base64url') === response.id);
        if (!authenticator) return res.status(400).json({ message: 'Authenticator not recognized.' });

        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: user.currentChallenge,
            expectedOrigin,
            expectedRPID: rpID,
            authenticator,
        });

        if (verification.verified) {
            const payload = { user: { id: user.id } };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
            user.currentChallenge = undefined;
            await user.save();
            res.json({ verified: true, token, user: { phone: user.phone, balance: user.balance, fullName: user.fullName, withdrawalMethod: user.withdrawalMethod } });
        } else {
            res.status(400).json({ verified: false, message: 'Verification failed.' });
        }
    } catch (error) {
        console.error("WebAuthn Verify Login Error:", error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;