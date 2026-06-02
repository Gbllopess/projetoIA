// ========== LOGIN PAGE LOGIC ==========

// Panel Navigation
function showPanel(panelId) {
    document.querySelectorAll('.form-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const target = document.getElementById(panelId);
    if (target) {
        target.classList.add('active');
    }
}

// Toggle Password Visibility
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

// Password Strength Checker
function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const fill = document.getElementById('strengthFill');
    const text = document.getElementById('strengthText');
    if (!fill || !text) return;

    const levels = [
        { width: '0%', color: 'transparent', label: '' },
        { width: '20%', color: '#ff6b6b', label: 'Fraca' },
        { width: '40%', color: '#fdcb6e', label: 'Razoável' },
        { width: '60%', color: '#fdcb6e', label: 'Média' },
        { width: '80%', color: '#00b894', label: 'Forte' },
        { width: '100%', color: '#00b894', label: 'Excelente' }
    ];

    const level = levels[score] || levels[0];
    fill.style.width = level.width;
    fill.style.background = level.color;
    text.textContent = level.label;
    text.style.color = level.color;
}

// Show Toast Notification
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Clear Errors
function clearErrors(form) {
    form.querySelectorAll('.input-wrapper.error').forEach(el => {
        el.classList.remove('error');
    });
    form.querySelectorAll('.error-message').forEach(el => el.remove());
}

// Show Input Error
function showInputError(input, message) {
    const wrapper = input.closest('.input-wrapper');
    wrapper.classList.add('error');

    const existing = wrapper.parentElement.querySelector('.error-message');
    if (existing) existing.remove();

    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = `⚠ ${message}`;
    wrapper.parentElement.appendChild(errorEl);
}

// Set Button Loading State
function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    
    if (loading) {
        btn.disabled = true;
        if (text) text.style.display = 'none';
        if (loader) loader.classList.remove('hidden');
    } else {
        btn.disabled = false;
        if (text) text.style.display = '';
        if (loader) loader.classList.add('hidden');
    }
}

// ========== FORM HANDLERS ==========

function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    clearErrors(form);

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email) {
        showInputError(document.getElementById('loginEmail'), 'Informe seu e-mail');
        return;
    }

    if (!password) {
        showInputError(document.getElementById('loginPassword'), 'Informe sua senha');
        return;
    }

    setLoading('loginBtn', true);

    fetch('http://localhost:5005/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(async r => {
        setLoading('loginBtn', false);
        const data = await r.json();
        
        if (r.ok) {
            // Store auth state
            const rememberMe = document.getElementById('rememberMe').checked;
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('dashboardpro_auth', JSON.stringify({
                email: data.user.email,
                name: data.user.name,
                id: data.user.id,
                token: data.token,
                loggedIn: true,
                timestamp: Date.now()
            }));

            showToast('Login realizado com sucesso!', 'success');

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        } else {
            showToast(data.error || 'Erro ao realizar login', 'error');
        }
    })
    .catch(e => {
        setLoading('loginBtn', false);
        console.error(e);
        showToast('Erro de conexão com o servidor', 'error');
    });
}

function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    clearErrors(form);

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    const terms = document.getElementById('termsCheck').checked;

    let hasError = false;

    if (!name) {
        showInputError(document.getElementById('registerName'), 'Informe seu nome');
        hasError = true;
    }

    if (!email) {
        showInputError(document.getElementById('registerEmail'), 'Informe seu e-mail');
        hasError = true;
    }

    if (password.length < 6) {
        showInputError(document.getElementById('registerPassword'), 'A senha deve ter no mínimo 6 caracteres');
        hasError = true;
    }

    if (password !== confirm) {
        showInputError(document.getElementById('registerConfirm'), 'As senhas não coincidem');
        hasError = true;
    }

    if (!terms) {
        showToast('Aceite os termos de uso para continuar', 'error');
        hasError = true;
    }

    if (hasError) return;

    setLoading('registerBtn', true);

    fetch('http://localhost:5005/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    })
    .then(async r => {
        setLoading('registerBtn', false);
        const data = await r.json();

        if (r.ok) {
            document.getElementById('successTitle').textContent = 'Conta criada!';
            document.getElementById('successMessage').textContent = 
                `Bem-vindo, ${name}! Sua conta foi criada com sucesso. Faça login para começar.`;
            showPanel('successPanel');
            showToast('Conta criada com sucesso!', 'success');
        } else {
            showToast(data.error || 'Erro ao criar conta', 'error');
        }
    })
    .catch(e => {
        setLoading('registerBtn', false);
        console.error(e);
        showToast('Erro de conexão com o servidor', 'error');
    });
}

function handleForgotPassword(e) {
    e.preventDefault();
    const form = e.target;
    clearErrors(form);

    const email = document.getElementById('forgotEmail').value.trim();

    if (!email) {
        showInputError(document.getElementById('forgotEmail'), 'Informe seu e-mail');
        return;
    }

    setLoading('forgotBtn', true);

    setTimeout(() => {
        setLoading('forgotBtn', false);

        document.getElementById('successTitle').textContent = 'E-mail enviado!';
        document.getElementById('successMessage').textContent = 
            `Enviamos um link de recuperação para ${email}. Verifique sua caixa de entrada.`;
        showPanel('successPanel');
        showToast('Link de recuperação enviado!', 'success');
    }, 1500);
}

// Social Login (placeholder)
function socialLogin(provider) {
    showToast(`Login com ${provider} em breve!`, 'info');
}

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    const auth = localStorage.getItem('dashboardpro_auth') || sessionStorage.getItem('dashboardpro_auth');
    if (auth) {
        try {
            const data = JSON.parse(auth);
            if (data.loggedIn) {
                window.location.href = 'index.html';
                return;
            }
        } catch (e) {
            // Invalid auth data, continue to login
        }
    }

    // Password strength listener
    const registerPassword = document.getElementById('registerPassword');
    if (registerPassword) {
        registerPassword.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value);
        });
    }

    // Clear errors on input focus
    document.querySelectorAll('.input-wrapper input').forEach(input => {
        input.addEventListener('focus', () => {
            const wrapper = input.closest('.input-wrapper');
            wrapper.classList.remove('error');
            const errorMsg = wrapper.parentElement.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        });
    });

    // Enter key support on forms
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
                e.preventDefault();
                form.dispatchEvent(new Event('submit'));
            }
        });
    });
});
