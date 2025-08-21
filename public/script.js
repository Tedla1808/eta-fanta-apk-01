// --- START OF FILE script.js --- (FINAL, CORRECTED, WITH REFERRAL SYSTEM)

document.addEventListener('DOMContentLoaded', () => {
    // ======== GLOBAL STATE & CONSTANTS ========
    const CURRENT_APP_VERSION = '1.0.0'; 
    const appState = { isLoggedIn: false, user: null, language: 'en', betting: { slotsData: {}, selections: {} } };
    const API_BASE_URL = 'https://eta-fanta-apk-01.onrender.com';
    const socket = io(API_BASE_URL);
    const TOTAL_SLOT_BOXES = 100;
    const COMMISSION_RATES = {
        'slot0.9': 0.11, 'slot1': 0.10, 'slot2': 0.09, 'slot3': 0.08, 
        'slot4': 0.07, 'slot5': 0.06, 'slot6': 0.05, 'slot7': 0.04
    };
    const translations = {
        en: { getApp: 'Get Eta Fanta App', register: 'Register', deposit: 'Deposit', settings: 'Settings', logout: 'Logout', play: 'PLAY', bet: 'BET', contactUs: 'Contact Us', createAccount: 'Create Your Account', userIdPhone: 'User ID (Phone Number)', sendOtp: 'Send OTP', enterVerificationCode: 'Enter Verification Code', setPassword: 'Set Your Password', save: 'Save', login: 'Login', password: 'Password', forgotPassword: 'Forgot password?', rememberMe: 'Remember Me', resetPassword: 'Reset Password', sendNewPassword: 'Send New Password', depositFunds: 'Deposit Funds', depositTo: 'Deposit To:', verifyDeposit: 'I HAVE DEPOSITED', chooseSlot: 'Choose a Slot', amountToBet: 'Amount to Bet:', placeBet: 'Place Bet', recentWinners: 'Recent Winners', done: 'Done', exit: 'Exit', profile: 'Profile', withdrawal: 'Withdrawal', history: 'History', about: 'About', profileSettings: 'Profile Settings', saveChanges: 'Save Changes', manageMethod: 'Manage Withdrawal Method', saveMethod: 'Save Method', reqWithdrawal: 'Request Withdrawal', txHistory: 'Transaction History', aboutApp: 'About Eta Fanta', changePassword: 'Change Password' },
        am: { getApp: 'መተግበሪያውን ያግኙ', register: 'ይመዝገቡ', deposit: 'ገንዘብ ያስገቡ', settings: 'ቅንብሮች', logout: 'ውጣ', play: 'ይጫወቱ', bet: 'ውርርድ', contactUs: 'ያግኙን', createAccount: 'አካውንት ይፍጠሩ', userIdPhone: 'መለያ (ስልክ ቁጥር)', sendOtp: 'ኮድ ላክ', enterVerificationCode: 'ማረጋገጫ ኮድ ያስገቡ', setPassword: 'የይለፍ ቃል ያዘጋጁ', save: 'አስቀምጥ', login: 'ግባ', password: 'የይለፍ ቃል', forgotPassword: 'የይለፍ ቃል ረስተዋል?', rememberMe: 'አስታውሰኝ', resetPassword: 'የይለፍ ቃል ዳግም ያስጀምሩ', sendNewPassword: 'አዲስ የይለፍ ቃል ላክ', depositFunds: 'ገንዘብ ያስገቡ', depositTo: 'ለዚህ ያስገቡ:', verifyDeposit: 'አስገብቻለሁ', chooseSlot: 'ቁማር ቦታ ይምረጡ', amountToBet: 'የውርርድ መጠን፡', placeBet: 'ውርርድ ያድርጉ', recentWinners: 'የቅርብ ጊዜ አሸናፊዎች', done: 'ተከናውኗል', exit: 'ውጣ', profile: 'መገለጫ', withdrawal: 'ገንዘብ ማውጣት', history: 'ታሪክ', about: 'ስለ', profileSettings: 'የመገለጫ ቅንብሮች', saveChanges: 'ለውጦችን ያስቀምጡ', manageMethod: 'የማውጫ ዘዴ ያቀናብሩ', saveMethod: 'ዘዴ አስቀምጥ', reqWithdrawal: 'ገንዘብ ማውጣት ይጠይቁ', txHistory: 'የግብይት ታሪክ', aboutApp: 'ስለ እጣ ፋንታ', changePassword: 'የይለፍ ቃል ይቀይሩ' },
        om: { getApp: 'Appilikeeshinii keenya argadhaa', register: 'Galmeessi', deposit: 'Maallaqa Olkaa\'i', settings: 'Qindaa\'inoota', logout: 'Bahi', play: 'Taphadhu', bet: 'Ciibsaa', contactUs: 'Nu qunnami', createAccount: 'Akkaawuntii Uumi', userIdPhone: 'ID fayyadamaa (Lakkoofsa Bilbilaa)', sendOtp: 'OTP Ergi', enterVerificationCode: 'Koodii Mirkaneessaa Galchi', setPassword: 'Jecha Darbeessaa Keessi', save: 'Kuusi', login: 'Seenii', password: 'Jecha Darbeessaa', forgotPassword: 'Jecha darbeessaa irraanfattee?', rememberMe: 'Na Yaadadhu', resetPassword: 'Jecha Darbeessaa Haaromsi', sendNewPassword: 'Jecha Darbeessaa Haaraa Ergi', depositFunds: 'Maallaqa Olkaa\'i', depositTo: 'Gara:', verifyDeposit: 'ANNI OLKAA\'EERA', chooseSlot: 'Iddoo Ciibsaa Filadhu', amountToBet: 'Hanga Ciibsamu:', placeBet: 'Ciibsaa Godhi', recentWinners: 'Mo\'attoota Dhiheenyaa', done: 'Xumurameera', exit: 'Bahi', profile: 'Piroofaayilii', withdrawal: 'Maallaqa Baasuu', history: 'Seenaa', about: 'Waa\'ee', profileSettings: 'Qindaa\'inoota Piroofaayilii', saveChanges: 'Jijjiirama Kuusi', manageMethod: 'Mala Maallaqa Baasuu Bulchi', saveMethod: 'Mala Kuusi', reqWithdrawal: 'Maallaqa Baasuu Gaafadhu', txHistory: 'Seenaa Gurgurtaa', aboutApp: 'Waa\'ee Eta Fanta', changePassword: 'Jecha Darbeessaa Jijjiiri' }
    };
    const DOM = {
        mainActionBtn: document.getElementById('main-action-btn'), allScreens: document.querySelectorAll('.app-screen'), allModals: document.querySelectorAll('.modal-overlay'), loggedOutView: document.getElementById('logged-out-view'), loggedInView: document.getElementById('logged-in-view'), userPhoneDisplay: document.getElementById('user-phone-display'), userBalanceDisplay: document.getElementById('user-balance-display'), registerBtnHeader: document.getElementById('register-btn-header'), depositBtn: document.getElementById('deposit-btn'), settingsBtn: document.getElementById('settings-btn'), logoutBtn: document.getElementById('logout-btn'), logoLink: document.getElementById('logo-link'), registerModal: document.getElementById('register-modal'), loginModal: document.getElementById('login-modal'), forgotPasswordModal: document.getElementById('forgot-password-modal'), depositModal: document.getElementById('deposit-modal'), depositVerificationModal: document.getElementById('deposit-verification-modal'), bettingGridModal: document.getElementById('betting-grid-modal'), settingsModal: document.getElementById('settings-modal'), settingsTabs: document.querySelector('.settings-tabs'), settingsContent: document.querySelectorAll('.settings-content .tab-content'), transactionHistoryTableBody: document.getElementById('transaction-history-table-body'), iHaveDepositedBtn: document.getElementById('i-have-deposited-btn'), verifyDepositBtn: document.getElementById('verify-deposit-btn'), depositorPhoneInput: document.getElementById('depositor-phone-input'), depositAmountInput: document.getElementById('deposit-amount-input'), loginBtnModal: document.getElementById('login-btn-modal'), phoneLoginInput: document.getElementById('phone-login'), togglePasswordIcon: document.getElementById('toggle-password'), passwordLoginInput: document.getElementById('password-login'), slotsContainer: document.querySelector('.slots-container'), bettingGridContainer: document.getElementById('betting-grid-container'), bettingGridTitle: document.getElementById('betting-grid-title'), totalBetAmountEl: document.getElementById('total-bet-amount'), placeBetBtn: document.getElementById('place-bet-btn'), clearBetBtn: document.getElementById('clear-bet-btn'), registerStep1: document.getElementById('register-step-1'), registerStep1b: document.getElementById('register-step-1b'), registerStep2: document.getElementById('register-step-2'), registerStep3: document.getElementById('register-step-3'), continueToTelegramBtn: document.getElementById('continue-to-telegram-btn'), phoneRegisterInput: document.getElementById('phone-register'), countryCodeRegister: document.getElementById('country-code-register'), checkTelegramBtn: document.getElementById('check-telegram-btn'), otpInput: document.getElementById('otp-input'), verifyOtpBtn: document.getElementById('verify-otp-btn'), passwordRegisterInput: document.getElementById('password-register'), confirmPasswordRegisterInput: document.getElementById('confirm-password-register'), passwordError: document.getElementById('password-error'), savePasswordBtn: document.getElementById('save-password-btn'), changePasswordBtn: document.getElementById('change-password-btn'), currentPasswordInput: document.getElementById('current-password'), newPasswordInput: document.getElementById('new-password'), confirmNewPasswordInput: document.getElementById('confirm-new-password'), changePasswordError: document.getElementById('change-password-error'), withdrawalAccountNameInput: document.getElementById('withdrawal-account-name'), withdrawalAccountPhoneInput: document.getElementById('withdrawal-account-phone'), withdrawalProviderSelect: document.getElementById('withdrawal-provider'), saveWithdrawalMethodBtn: document.getElementById('save-withdrawal-method-btn'), fullNameInput: document.getElementById('full-name-input'), saveProfileBtn: document.getElementById('save-profile-btn'), goToRegisterLink: document.getElementById('go-to-register-link'), forgotPasswordLink: document.getElementById('forgot-password-link'), sendNewPasswordBtn: document.getElementById('send-new-password-btn'), withdrawalBalance: document.getElementById('withdrawal-balance'), withdrawalAmountInput: document.getElementById('withdrawal-amount-input'), requestWithdrawalBtn: document.getElementById('request-withdrawal-btn'), recentWinnersList: document.getElementById('recent-winners-list'), updateScreen: document.getElementById('update-screen'), updateNowBtn: document.getElementById('update-now-btn'), rememberMeCheck: document.getElementById('remember-me-check'), countryCodeLogin: document.getElementById('country-code-login'), getAppLink: document.getElementById('get-app-link'),
        referralCodeInput: document.getElementById('referral-code-input'),
        userReferralCode: document.getElementById('user-referral-code'),
        copyReferralCodeBtn: document.getElementById('copy-referral-code-btn'),
    };
    let registrationPhone = '';

    const isNativeApp = () => !!window.Capacitor;
    const showScreen = (id) => { DOM.allScreens.forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); };
    const showModal = (el) => { if (el) el.classList.remove('hidden'); };
    const hideAllModals = () => DOM.allModals.forEach(m => m.classList.add('hidden'));
    const showToast = (msg, type = 'success') => { const t = document.getElementById('toast-notification'); t.textContent = msg; t.className = `toast-notification ${type}`; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); };
    
    socket.on('connect', () => { console.log('[Socket] Connected!'); if (localStorage.getItem('token')) socket.emit('authenticate', localStorage.getItem('token')); });
    socket.on('depositApproved', (data) => { showToast(data.message, 'success'); if (appState.user) appState.user.balance = data.newBalance; updateUI(); hideAllModals(); showScreen('betting-screen'); fetchSlotData(); });
    socket.on('depositRejected', (data) => { if (data.final) { showToast('Account locked. Contact support.', 'error'); setTimeout(() => { hideAllModals(); DOM.logoutBtn.click(); }, 3000); } else { showToast(`Verification failed. ${data.attemptsLeft} attempt(s) left.`, 'error'); setTimeout(() => { hideAllModals(); }, 3000); } });
    socket.on('withdrawalApproved', (data) => { showToast(data.message, 'success'); if (appState.user) appState.user.balance = data.newBalance; updateUI(); DOM.requestWithdrawalBtn.disabled = false; applyTranslations(); });
    socket.on('withdrawalDeclined', (data) => { showToast(data.message, 'error'); DOM.requestWithdrawalBtn.disabled = false; applyTranslations(); });

    const applyTranslations = () => {
        const lang = appState.language;
        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.getAttribute('data-lang-key');
            if (translations[lang] && translations[lang][key]) {
                const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0);
                if (textNode) { textNode.nodeValue = " " + translations[lang][key]; }
                else { el.textContent = translations[lang][key]; }
            }
        });
    };
    
    const populateSettingsForm = () => {
        if (!appState.isLoggedIn) return;
        if (appState.user.withdrawalMethod) {
            DOM.withdrawalAccountNameInput.value = appState.user.withdrawalMethod.accountName || '';
            DOM.withdrawalAccountPhoneInput.value = appState.user.withdrawalMethod.accountPhone || '';
            DOM.withdrawalProviderSelect.value = appState.user.withdrawalMethod.provider || 'telebirr';
        }
        DOM.fullNameInput.value = appState.user.fullName || '';
    };

    const updateUI = () => {
        if (appState.isLoggedIn) {
            DOM.loggedOutView.classList.add('hidden');
            DOM.loggedInView.classList.remove('hidden');
            DOM.getAppLink.classList.add('hidden');
            const balance = Number(appState.user.balance).toFixed(2);
            DOM.userPhoneDisplay.textContent = `+${appState.user.phone.slice(0, 3)}...${appState.user.phone.slice(-4)}`;
            DOM.userBalanceDisplay.textContent = `${balance} ETB`;
            DOM.withdrawalBalance.textContent = `${balance} ETB`;
            DOM.mainActionBtn.dataset.langKey = 'bet';
            populateSettingsForm();
        } else {
            DOM.loggedOutView.classList.remove('hidden');
            DOM.loggedInView.classList.add('hidden');
            if (!isNativeApp()) {
                DOM.getAppLink.classList.remove('hidden');
            } else {
                DOM.getAppLink.classList.add('hidden');
            }
            DOM.mainActionBtn.dataset.langKey = 'play';
        }
        setTimeout(() => {
            applyTranslations();
        }, 0);
        updateSlotDisplay();
    };

    const updateSlotDisplay = () => {
        if (!appState.betting.slotsData) return;
        
        const slotDisplayOrder = [
            { id: '0.9', title: 'Slot 1' }, { id: '1', title: 'Slot 2' },
            { id: '2', title: 'Slot 3' }, { id: '3', title: 'Slot 4' },
            { id: '4', title: 'Slot 5' }, { id: '5', title: 'Slot 6' },
            { id: '6', title: 'Slot 7' }, { id: '7', title: 'Slot 8' }
        ];

        slotDisplayOrder.forEach(slotInfo => {
            const btn = document.querySelector(`.slot-btn[data-slot-id="${slotInfo.id}"]`);
            if (!btn) return;

            const internalSlotId = `slot${slotInfo.id}`;
            const slotData = appState.betting.slotsData[internalSlotId];
            
            if (slotData) {
                const winAmountEl = btn.querySelector('.slot-win-amount');
                const titleEl = btn.querySelector('.slot-title');
                const fullnessEl = btn.querySelector('.slot-fullness-display');
                const betCostEl = btn.querySelector('.slot-bet-cost');

                const totalJackpot = slotData.cost * TOTAL_SLOT_BOXES;
                const commissionRate = COMMISSION_RATES[internalSlotId] || 0;
                const displayedWinAmount = totalJackpot - (totalJackpot * commissionRate);

                winAmountEl.textContent = `WIN ${displayedWinAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ETB`;
                titleEl.textContent = slotInfo.title;
                betCostEl.textContent = `Bet ${slotData.cost.toFixed(2)} ETB`;
                fullnessEl.textContent = `${slotData.percentage}% Full`;
            }
        });
    };

    const updateTotalBetAmount = () => {
        let totalCost = 0;
        for (const slotId in appState.betting.selections) {
            totalCost += appState.betting.selections[slotId].length * (appState.betting.slotsData[slotId]?.cost || 0);
        }
        DOM.totalBetAmountEl.textContent = `${totalCost.toFixed(2)} ETB`;
        DOM.placeBetBtn.disabled = totalCost === 0;
    };

    const renderTransactionHistory = (transactions) => {
        if (!DOM.transactionHistoryTableBody) return;
        DOM.transactionHistoryTableBody.innerHTML = '';
        if (transactions.length === 0) {
            DOM.transactionHistoryTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No transactions found.</td></tr>`;
            return;
        }
        transactions.forEach(tx => {
            const row = document.createElement('tr');
            const isPositive = tx.type === 'Deposit' && tx.status === 'Completed';
            let statusText = tx.status;
            let statusClass = tx.status.toLowerCase();
            if (tx.status === 'Failed' || tx.status === 'Pending') {
                statusText = 'Canceled';
                statusClass = 'canceled';
            }
            row.innerHTML = `
                <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
                <td>${tx.type}</td>
                <td class="${isPositive ? 'amount-positive' : 'amount-negative'}">${tx.amount.toFixed(2)} ETB</td>
                <td><span class="status-${statusClass}">${statusText}</span></td>
            `;
            DOM.transactionHistoryTableBody.appendChild(row);
        });
    };
    
    const fetchAndRenderTransactionHistory = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/transaction-history`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch transaction history');
            const data = await response.json();
            renderTransactionHistory(data);
        } catch (error) {
            showToast(error.message, 'error');
            if(DOM.transactionHistoryTableBody) DOM.transactionHistoryTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Could not load history.</td></tr>`;
        }
    };
    
    const fetchSlotData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) { showScreen('home-screen'); return; }
            const response = await fetch(`${API_BASE_URL}/api/game/slots`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Could not fetch slot data.');
            const data = await response.json();
            appState.betting.slotsData = data;
            updateSlotDisplay();
        } catch (error) {
            showToast(error.message, 'error');
            if (error.response && error.response.status === 401) { DOM.logoutBtn.click(); }
        }
    };
    
    const fetchAndRenderWinners = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/game/recent-winners`);
            if (!response.ok) return;
            const winners = await response.json();
            if (!DOM.recentWinnersList) return;
            DOM.recentWinnersList.innerHTML = '';
            if (winners.length === 0) {
                DOM.recentWinnersList.innerHTML = '<li>No winners yet.</li>';
                return;
            }
            winners.forEach(winner => {
                if (!winner.user || !winner.user.phone) return;
                const phone = winner.user.phone;
                const obfuscatedPhone = `${phone.slice(0, 3)}...${phone.slice(-2)}`;
                const listItem = document.createElement('li');
                listItem.textContent = `${obfuscatedPhone} won ${winner.prizeAmount.toFixed(2)} ETB on ${winner.slotId.replace('slot', 'Slot ')}!`;
                DOM.recentWinnersList.appendChild(listItem);
            });
        } catch (error) {
            console.error("Could not fetch recent winners", error);
            if (DOM.recentWinnersList) DOM.recentWinnersList.innerHTML = '<li>Error loading winners.</li>';
        }
    };

    const populateRememberedUser = () => {
        const rememberedPhone = localStorage.getItem('rememberedUserPhone');
        const rememberedCountryCode = localStorage.getItem('rememberedUserCountryCode');
        if (rememberedPhone && rememberedCountryCode) {
            DOM.phoneLoginInput.value = rememberedPhone;
            DOM.countryCodeLogin.value = rememberedCountryCode;
            DOM.rememberMeCheck.checked = true;
        }
    };

    const init = () => {
        if (!isNativeApp()) {
            DOM.getAppLink.classList.remove('hidden');
        }

        DOM.logoLink.addEventListener('click', (e) => { e.preventDefault(); hideAllModals(); showScreen('home-screen'); });
        DOM.mainActionBtn.addEventListener('click', () => { if (appState.isLoggedIn) { showScreen('betting-screen'); fetchSlotData(); fetchAndRenderWinners(); } else { showModal(DOM.loginModal); } });
        DOM.registerBtnHeader.addEventListener('click', () => { showModal(DOM.registerModal); DOM.registerStep1.classList.remove('hidden'); DOM.registerStep1b.classList.add('hidden'); DOM.registerStep2.classList.add('hidden'); DOM.registerStep3.classList.add('hidden'); });
        DOM.depositBtn.addEventListener('click', () => showModal(DOM.depositModal));
        DOM.settingsBtn.addEventListener('click', () => { showModal(DOM.settingsModal); DOM.settingsTabs.querySelector('[data-tab="profile"]').click(); });
        DOM.logoutBtn.addEventListener('click', () => { appState.isLoggedIn = false; appState.user = null; localStorage.removeItem('token'); socket.disconnect().connect(); appState.betting.selections = {}; updateTotalBetAmount(); updateUI(); showScreen('home-screen'); showToast('Logged out successfully.', 'success'); });
        DOM.allModals.forEach(m => m.addEventListener('click', (e) => { if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('close-modal-btn')) hideAllModals(); }));
        document.getElementById('language-selector').addEventListener('change', (e) => { appState.language = e.target.value; updateUI(); });
        DOM.togglePasswordIcon.addEventListener('click', () => { DOM.passwordLoginInput.type = DOM.passwordLoginInput.type === 'password' ? 'text' : 'password'; DOM.togglePasswordIcon.classList.toggle('fa-eye-slash'); DOM.togglePasswordIcon.classList.toggle('fa-eye'); });
        
        DOM.settingsTabs.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.tab-link');
            if (!clickedTab) return;
            const tabId = clickedTab.dataset.tab;
            DOM.settingsTabs.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
            DOM.settingsContent.forEach(content => content.classList.remove('active'));
            clickedTab.classList.add('active');
            const activeTabContent = document.getElementById(`tab-${tabId}`);
            if(activeTabContent) activeTabContent.classList.add('active');
            if (appState.isLoggedIn) {
                if (tabId === 'transaction-history') fetchAndRenderTransactionHistory();
                if (tabId === 'referral' && appState.user) {
                    DOM.userReferralCode.textContent = appState.user.referralCode || 'N/A';
                }
            }
        });

        DOM.copyReferralCodeBtn.addEventListener('click', () => {
            if (DOM.userReferralCode.textContent && DOM.userReferralCode.textContent !== 'Loading...') {
                navigator.clipboard.writeText(DOM.userReferralCode.textContent);
                showToast('Referral code copied!', 'success');
            }
        });
        
        DOM.iHaveDepositedBtn.addEventListener('click', () => {
            DOM.depositorPhoneInput.value = '';
            DOM.depositAmountInput.value = '';
            DOM.verifyDepositBtn.disabled = false;
            DOM.verifyDepositBtn.textContent = 'Verify';
            DOM.depositorPhoneInput.disabled = false;
            DOM.depositAmountInput.disabled = false;
            applyTranslations();
            hideAllModals();
            showModal(DOM.depositVerificationModal);
        });
        DOM.verifyDepositBtn.addEventListener('click', async () => {
            const depositorPhone = DOM.depositorPhoneInput.value;
            const amount = DOM.depositAmountInput.value;
            const token = localStorage.getItem('token');
            if (!depositorPhone || !amount) { return showToast('Please enter both phone and amount.', 'error'); }
            DOM.verifyDepositBtn.disabled = true;
            DOM.verifyDepositBtn.textContent = 'Verifying...';
            DOM.depositorPhoneInput.disabled = true;
            DOM.depositAmountInput.disabled = true;
            try {
                const response = await fetch(`${API_BASE_URL}/api/user/request-deposit-verification`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ depositorPhone, amount }) });
                const data = await response.json();
                if (!response.ok) { throw new Error(data.message); }
                showToast(data.message, 'success');
            } catch (error) {
                showToast(error.message, 'error');
                DOM.verifyDepositBtn.disabled = false;
                DOM.verifyDepositBtn.textContent = 'Verify';
                DOM.depositorPhoneInput.disabled = false;
                DOM.depositAmountInput.disabled = false;
            }
        });
        DOM.loginBtnModal.addEventListener('click', async () => {
            const countryCode = DOM.countryCodeLogin.value;
            const phone = DOM.phoneLoginInput.value;
            const password = DOM.passwordLoginInput.value;
            if (!phone || !password || !document.getElementById('terms-check').checked) { return showToast('Fill all fields and agree to terms.', 'error'); }
            const fullPhone = countryCode.replace('+', '') + phone;
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: fullPhone, password }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Login failed');
                
                if (DOM.rememberMeCheck.checked) {
                    localStorage.setItem('rememberedUserPhone', phone);
                    localStorage.setItem('rememberedUserCountryCode', countryCode);
                } else {
                    localStorage.removeItem('rememberedUserPhone');
                    localStorage.removeItem('rememberedUserCountryCode');
                }

                appState.isLoggedIn = true;
                appState.user = data.user;
                localStorage.setItem('token', data.token);
                socket.emit('authenticate', data.token);
                hideAllModals();
                updateUI();
                showToast('Login successful!', 'success');
            } catch (error) { showToast(error.message, 'error'); }
        });
        DOM.goToRegisterLink.addEventListener('click', (e) => { e.preventDefault(); hideAllModals(); showModal(DOM.registerModal); });
        DOM.forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); hideAllModals(); showModal(DOM.forgotPasswordModal); });
        DOM.sendNewPasswordBtn.addEventListener('click', async () => {
            const countryCode = document.getElementById('country-code-reset').value;
            const phoneInput = document.getElementById('phone-reset').value;
            if (!phoneInput) { return showToast('Please enter your phone number.', 'error'); }
            const fullPhone = countryCode.replace('+', '') + phoneInput;
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: fullPhone }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                showToast(data.message, 'success');
                hideAllModals();
                showModal(DOM.loginModal);
            } catch (error) { showToast(error.message, 'error'); }
        });
        DOM.saveProfileBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('token');
            if (!token) return showToast('Authentication Error', 'error');
            const fullName = DOM.fullNameInput.value;
            try {
                const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ fullName })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                appState.user.fullName = data.fullName;
                populateSettingsForm();
                showToast('Profile updated successfully!', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
        DOM.saveWithdrawalMethodBtn.addEventListener('click', async () => {
            const accountName = DOM.withdrawalAccountNameInput.value;
            const accountPhone = DOM.withdrawalAccountPhoneInput.value;
            const provider = DOM.withdrawalProviderSelect.value;
            const token = localStorage.getItem('token');
            if (!accountName || !accountPhone) { return showToast('Please fill in both Account Name and Phone Number.', 'error'); }
            if (!token) { return showToast('Authentication error. Please log in again.', 'error'); }
            try {
                const response = await fetch(`${API_BASE_URL}/api/user/withdrawal-method`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ accountName, accountPhone, provider }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                if (appState.user) { appState.user.withdrawalMethod = { accountName, accountPhone, provider }; }
                showToast('Withdrawal method saved!', 'success');
            } catch (error) { showToast(error.message, 'error'); }
        });
        DOM.continueToTelegramBtn.addEventListener('click', () => {
            const phone = DOM.countryCodeRegister.value.replace('+', '') + DOM.phoneRegisterInput.value;
            if (DOM.phoneRegisterInput.value.length < 9) { return showToast('Please enter a valid phone number.', 'error'); }
            registrationPhone = phone;
            DOM.registerStep1.classList.add('hidden');
            DOM.registerStep1b.classList.remove('hidden');
        });
        DOM.checkTelegramBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/otp/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: registrationPhone }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                showToast(data.message, 'success');
                DOM.registerStep1b.classList.add('hidden');
                DOM.registerStep2.classList.remove('hidden');
            } catch (error) { showToast(error.message, 'error'); }
        });
        DOM.verifyOtpBtn.addEventListener('click', async () => {
            const otp = DOM.otpInput.value;
            if (otp.length !== 6) { showToast('OTP must be 6 digits.', 'error'); return; }
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/otp/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: registrationPhone, otp: otp }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                showToast(data.message, 'success');
                DOM.registerStep2.classList.add('hidden');
                DOM.registerStep3.classList.remove('hidden');
            } catch (error) { showToast(error.message, 'error'); }
        });
        DOM.savePasswordBtn.addEventListener('click', async () => {
            const password = DOM.passwordRegisterInput.value;
            const confirmPassword = DOM.confirmPasswordRegisterInput.value;
            const referralCode = DOM.referralCodeInput.value;
            DOM.passwordError.classList.add('hidden');
            if (password.length < 6) { DOM.passwordError.textContent = 'Password must be at least 6 characters.'; DOM.passwordError.classList.remove('hidden'); return; }
            if (password !== confirmPassword) { DOM.passwordError.textContent = 'Passwords do not match.'; DOM.passwordError.classList.remove('hidden'); return; }
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: registrationPhone, password: password, referralCode: referralCode }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                showToast(data.message, 'success');
                hideAllModals();
                showModal(DOM.loginModal);
            } catch (error) { showToast(error.message, 'error'); }
        });
        DOM.changePasswordBtn.addEventListener('click', async () => {
            const currentPassword = DOM.currentPasswordInput.value; const newPassword = DOM.newPasswordInput.value; const confirmNewPassword = DOM.confirmNewPasswordInput.value; const token = localStorage.getItem('token');
            DOM.changePasswordError.classList.add('hidden');
            if (!currentPassword || !newPassword || !confirmNewPassword) { DOM.changePasswordError.textContent = 'Please fill all fields.'; DOM.changePasswordError.classList.remove('hidden'); return; }
            if (newPassword.length < 6) { DOM.changePasswordError.textContent = 'New password must be 6+ characters.'; DOM.changePasswordError.classList.remove('hidden'); return; }
            if (newPassword !== confirmNewPassword) { DOM.changePasswordError.textContent = 'Passwords do not match.'; DOM.changePasswordError.classList.remove('hidden'); return; }
            if (!token) { showToast('Authentication error.', 'error'); return; }
            try {
                const response = await fetch(`${API_BASE_URL}/api/user/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ currentPassword, newPassword }), });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Failed to change password.');
                showToast(data.message, 'success');
                DOM.currentPasswordInput.value = ''; DOM.newPasswordInput.value = ''; DOM.confirmNewPasswordInput.value = '';
            } catch (error) {
                DOM.changePasswordError.textContent = error.message; DOM.changePasswordError.classList.remove('hidden');
            }
        });
        DOM.slotsContainer.addEventListener('click', (e) => {
            const slotBtn = e.target.closest('.slot-btn');
            if (!slotBtn) return;
            const slotId = slotBtn.dataset.slotId;
            const internalSlotId = `slot${slotId}`;
            const slotData = appState.betting.slotsData[internalSlotId];
            if (!slotData) { showToast('Slot data not loaded.', 'error'); return; }
            DOM.bettingGridTitle.textContent = `${slotBtn.querySelector('.slot-title').textContent} - Bet Grid`;
            DOM.bettingGridContainer.innerHTML = '';
            DOM.bettingGridContainer.dataset.currentSlot = internalSlotId;
            for (let r = 1; r <= 10; r++) {
                for (let c = 1; c <= 10; c++) {
                    const box = document.createElement('div');
                    const boxId = `${r}-${c}`;
                    box.classList.add('grid-box');
                    box.dataset.boxId = boxId;
                    box.textContent = (r - 1) * 10 + c;
                    if (slotData.unavailableBoxes.includes(boxId)) { box.classList.add('unavailable'); }
                    else if (appState.betting.selections[internalSlotId]?.includes(boxId)) { box.classList.add('selected'); }
                    DOM.bettingGridContainer.appendChild(box);
                }
            }
            showModal(DOM.bettingGridModal);
        });
        DOM.bettingGridContainer.addEventListener('click', (e) => {
            const box = e.target.closest('.grid-box');
            if (!box || box.classList.contains('unavailable')) return;
            const slotId = DOM.bettingGridContainer.dataset.currentSlot;
            const boxId = box.dataset.boxId;
            if (!appState.betting.selections[slotId]) { appState.betting.selections[slotId] = []; }
            const selectionIndex = appState.betting.selections[slotId].indexOf(boxId);
            if (selectionIndex > -1) {
                appState.betting.selections[slotId].splice(selectionIndex, 1);
                box.classList.remove('selected');
            } else {
                appState.betting.selections[slotId].push(boxId);
                box.classList.add('selected');
            }
            updateTotalBetAmount();
        });
        DOM.placeBetBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('token');
            const bets = appState.betting.selections;
            if (Object.keys(bets).reduce((acc, key) => acc + (bets[key] ? bets[key].length : 0), 0) === 0) {
                showToast('Please select at least one box to bet.', 'error'); return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/game/bet`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ bets }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                showToast('Bets placed successfully!', 'success');
                appState.user.balance = data.newBalance;
                appState.betting.selections = {};
                updateUI();
                fetchSlotData();
                updateTotalBetAmount();
            } catch (error) {
                showToast(error.message, 'error');
                fetchSlotData();
            }
        });
        DOM.clearBetBtn.addEventListener('click', () => {
            appState.betting.selections = {};
            updateTotalBetAmount();
            document.querySelectorAll('#betting-grid-container .grid-box.selected').forEach(box => {
                box.classList.remove('selected');
            });
            showToast('Selections cleared.', 'success');
        });
        DOM.requestWithdrawalBtn.addEventListener('click', async () => {
            const amount = parseFloat(DOM.withdrawalAmountInput.value);
            const token = localStorage.getItem('token');
            if (!amount || amount <= 0) { return showToast('Please enter a valid amount.', 'error'); }
            if (amount > appState.user.balance) { return showToast('Withdrawal amount cannot be more than your available balance.', 'error'); }
            if (!token) { return showToast('Authentication error.', 'error'); }
            DOM.requestWithdrawalBtn.disabled = true;
            DOM.requestWithdrawalBtn.textContent = 'Submitting...';
            try {
                const response = await fetch(`${API_BASE_URL}/api/user/request-withdrawal`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ amount }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                showToast(data.message, 'success');
                DOM.withdrawalAmountInput.value = '';
            } catch (error) {
                showToast(error.message, 'error');
                DOM.requestWithdrawalBtn.disabled = false;
                applyTranslations();
            }
        });
    };
    
    const checkAppVersion = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/game/version`);
            if (!response.ok) { init(); return; }
            const data = await response.json();
            if (CURRENT_APP_VERSION < data.latestVersion) {
                DOM.allScreens.forEach(s => s.classList.add('hidden'));
                DOM.updateScreen.classList.remove('hidden');
                DOM.updateNowBtn.onclick = () => { window.location.href = data.updateUrl; };
            } else {
                init();
            }
        } catch (error) {
            console.error("Version check failed:", error);
            init();
        }
    };

    populateRememberedUser();
    checkAppVersion();
});