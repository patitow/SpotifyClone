FORM_NAME = window.FORM_NAME
const MIN_USER_LENGTH = 8
const MIN_PASS_LENGTH = 4
var state = 'blank'

function start() {
    // Verifica se a conta já está logada
    fetch('/connected_account', {method: "GET"}).then(r => r.text()).then(resp => {
        if (resp != '0')
            location.href = '/'
    })
    fetch('/forceACK', {method: "GET"})
    
    // Checa se o usuário quera enviar o formulário
    var userField = document.getElementById("user");
    userField.addEventListener("keypress", function(event) {
        if (event.key === "Enter")
            click()
    })
    var passField = document.getElementById("pass");
    passField.addEventListener("keypress", function(event) {
        if (event.key === "Enter")
            click()
    })
    var clickBtn = document.getElementById("clickBtn");
    clickBtn.addEventListener("click", function(event) {
        click()
    })
    
    // Voltar para o menu clicando na imagem
    var clickImg = document.getElementById("main_img");
    clickImg.addEventListener("click", function(event) {
        window.location = '/'
    })
}

// Comunica o clique do usuário em cadastro ou login com o servidor
function click() {
    var user = document.getElementById('user').value
    var pass = document.getElementById('pass').value

    // Tipos de problemas que podem ocorrer
    if (!isAlphaNumeric(user) || !isAlphaNumeric(pass))
        state = 'special'
    else if (user.length < MIN_USER_LENGTH && pass.length < MIN_PASS_LENGTH)
        state = 'small_user_pass'
    else if (user.length < MIN_USER_LENGTH)
        state = 'small_user'
    else if (pass.length < MIN_PASS_LENGTH)
        state = 'small_pass'
    else
        state = 'blank'

    // O formato de login e senha é válido, pode seguir para o servidor
    if (state == 'blank') {
        url = '/form=' + FORM_NAME + '&username=' + user + '&password=' + pass
        fetch(url, {method: "POST"}).then(r => r.text()).then(resp => {
            state = resp
            updateAlertMessage()
        })
        fetch('/forceACK', {method: "GET"})
    // Algo de errado com o formato, o usuário é alertado
    } else
        updateAlertMessage()
}

// Conjunto de imagens da página
var img_array = document.getElementsByTagName('img')

// Porcentagem de carregamento
var last_load_percentage = 0
function loadPercentage() {
    var i = 0
    var loaded_items = 0
    for (i = 0; i < img_array.length; i++)
        if (img_array[i].complete)
            loaded_items++
    return loaded_items / img_array.length
}

// Força a página a carregar se algum arquivo não chegar
var checkLoading = setInterval(function () {
    var percentage = loadPercentage()
    // Estagnou no carregamento
    if (percentage == last_load_percentage && percentage < 1)
        fetch('/forceACK', {method: "GET"})
    // Está avançando
    else if (percentage < 1)
        last_load_percentage = percentage
    // Completou, o loop é encerrado
    else
        clearInterval(checkLoading)
}, 1000)

// Detecta se uma string é alfanumérica sem incluir o espaço
function isAlphaNumeric(str) {
    var c, i, len;
    for (i = 0, len = str.length; i < len; i++) {
        c = str.charCodeAt(i)
        if (!(c > 47 && c < 58) && !(c > 64 && c < 91) && !(c > 96 && c < 123))
            return false
    }
    return true
}

// Apaga os erros da página se os critérios forem corrigidos
function typing(field) {
    if (field == 'user') {
        if (document.getElementById('user').value.length >= MIN_USER_LENGTH) {
            switch (state) {
                case 'small_user_pass':
                    state = 'small_pass';
                    break;
                case 'small_pass':
                    state = 'small_pass';
                    break;
                default:
                    state = 'blank'
            }
        }
    } else if (field == 'pass') {
        if (document.getElementById('pass').value.length >= MIN_PASS_LENGTH) {
            switch (state) {
                case 'small_user_pass':
                    state = 'small_user';
                    break;
                case 'small_user':
                    state = 'small_user';
                    break;
                default:
                    state = 'blank'
            }
        }
    }
    updateAlertMessage()
}

// Atualiza a mensagem de alerta para cada situação digitada pelo usuário
function updateAlertMessage() {
    var message = ''
    switch (state) {
        case 'blank':
            message = '';
            break;
        case 'already_logged':
            message = 'Essa conta já está logada!';
            break;
        case 'already_exists':
            message = 'Essa conta já está existe!';
            break;
        case 'welcome':
            location.href = '/';
            break;
        case 'wrong_pass':
            message = 'Senha incorreta, tente novamente.';
            break;
        case 'non_existent':
            message = 'Essa conta não existe!';
            break;
        case 'small_user':
            message = 'O nome deve ter pelo menos ' + MIN_USER_LENGTH + ' caracteres!';
            break;
        case 'small_pass':
            message = 'A senha deve ter pelo menos ' + MIN_PASS_LENGTH + ' caracteres!';
            break;
        case 'small_user_pass':
            message = 'O nome deve ter pelo menos ' + MIN_USER_LENGTH + ', e a senha, ' + MIN_PASS_LENGTH + '!';
            break;
        case 'special':
            message = 'Por favor, digite apenas letras e números.';
            break;
    }
    document.getElementById('error').innerText = message
    document.getElementById('error').style.display = (message.length > 0) ? ('block') : ('none')
}