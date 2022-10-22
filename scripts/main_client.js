var connected_account = '0'
var current_ID = ''
var searched_text_songs = ''
var favorite_image = ''
var all_songs = []
var all_playlists = []

// Checa se um elemento contém a playlist desejada
function containsPlaylist(elementID, playlist_name) {
    var element = document.getElementById(elementID)
    return element.innerHTML.includes('<p>' + playlist_name + '</p>')
}

// Cria uma nova playlist
function newPlaylist() {
    var user_playlists = document.getElementById('user_playlists')
    var playlist_name = `Playlist ${Math.floor(Math.random() * 100000)}`
    current_ID = playlist_name.replaceAll(' ','+')

    // Cria a playlist
    user_playlists.innerHTML += `
    <div id="${current_ID}" class="btn-playlist" onclick="displayPlaylist(this,'')">
        <img src="${favorite_image}">
        <p>${playlist_name}</p>
        <p hidden>**USER**</p>
        <p hidden>**/user_playlists**</p>
    </div>
    `

    // Sinaliza ao servidor
    document.getElementById(current_ID).click()
    fetch('add_playlist=' + playlist_name, {method: "PATCH"})
    fetch('/forceACK', {method: "GET"})
}

// Remove uma playlist do usuário
function removePlaylist(id) {
    var elements = document.getElementById('user_playlists').getElementsByClassName('playlist')
    for (var i in elements){
        if (elements[i].id == id) {
            // Remove da tela
            elements[i].remove()
            if (document.getElementById(id+'*'))
                document.getElementById(id+'*').click()
            else
                document.getElementById("current_playlist").innerHTML = ''
            
            // Sinaliza ao servidor
            fetch('remove_playlist=' + id.replaceAll('+',' '), {method: "PATCH"})
            fetch('/forceACK', {method: "GET"})
            break
        }
    }
    setState('user')
}

// Adiciona uma playlist a partir das padronizadas para o usuário
function addPlaylist(id) {
    var user_playlists = document.getElementById('user_playlists')
    var correctID = (id.endsWith('*')) ? (id.slice(0,-1)) : (id)

    // A playlist só pode ser criada se não existir previamente
    if (!user_playlists.innerHTML.includes(id)) {
        user_playlists.innerHTML += document.getElementById(id).outerHTML.replaceAll(id, correctID)
        document.getElementById(id).click()

        // Comunica ao servidor
        fetch('add_playlist=' + correctID.replaceAll('+',' '), {method: "PATCH"})
        fetch('/forceACK', {method: "GET"})
    }
    setState('user')
}

// Remove a música de uma playlist
function removeSong(song_file) {
    playlist = document.getElementById(current_ID)
    playlist_name = current_ID.replaceAll('+',' ')
    // Apaga a música da lista que contém as músicas da playlist
    playlist.outerHTML = playlist.outerHTML.replaceAll(`,${song_file}`, '').replaceAll(`'${song_file},`, "'").replaceAll(`'${song_file}'`, "''")
    // Comunica ao servidor
    fetch(`remove_song=${song_file}&playlist=${playlist_name}`, {method: "PATCH"})
    fetch('/forceACK', {method: "GET"})
    setState('playlist')
}

// Adiciona a música a uma playlist
function addSong(song_file) {
    playlist = document.getElementById(current_ID)
    playlist_name = current_ID.replaceAll('+',' ')
    if (!playlist.innerHTML.includes(song_file)) {
        // Playlist estava vazia
        if (playlist.outerHTML.includes(`displayPlaylist('${playlist_name}',''`)) {
            playlist.outerHTML = playlist.outerHTML.replaceAll(
                `displayPlaylist('${playlist_name}',''`,
                `displayPlaylist('${playlist_name}','${song_file}'`
            )
        }
        // Já tinha músicas, então adiciona com vírgula
        else
            playlist.outerHTML = playlist.outerHTML.replaceAll(`')"`,`,${song_file}')"`)
        fetch(`add_song=${song_file}&playlist=${playlist_name}`, {method: "PATCH"})
        fetch('/forceACK', {method: "GET"})
    }
    setState('playlist')
}

// Toca a música de uma playlist
function playSong(location) {
    var player = document.getElementById('loaded_music_players')
    var players = document.getElementsByClassName("music_player")
    var hasAudio = false

    // Informações para o usuário
    var song_split = location.split("/")
    var band = song_split[0]
    var album = song_split[1]
    var title = song_split[2].split(".")[0]
    document.getElementById('current_song_stats').innerHTML = `
    <label>${title}</label><p>${band}</p> 
    `
    document.getElementById('music_image').src = `./${band}/(${album}/${band}-${album}-capa.jpg`

    // Procura na lista de músicas baixadas se essa já existe para não pedir
    // novamente ao servidor
    for (var p in players) {
        // Ativa a música se for encontrada
        if ((players[p].innerHTML || '').includes(location)) {
            hasAudio = true
            if (players[p].hidden) {
                players[p].hidden = false
                players[p].play()
            }
            players[p].autoplay = true

        // Desativa as outras
        } else if ((players[p].innerHTML || 0) != 0) {
            players[p].autoplay = false
            players[p].pause()
            players[p].currentTime = 0
            players[p].hidden = true
        }
    }
    // Solicita a música ao servidor em um novo slot de áudio
    if (!hasAudio)
    player.innerHTML += `
    <audio class="music_player" controls autoplay>
        <source src="${location}" type="">
    </audio>
    `
}

// Detecta se uma string é alfanumérica incluindo espaço
function isAlphaNumeric(str) {
    var c, i, len;
    for (i = 0, len = str.length; i < len; i++) {
        c = str.charCodeAt(i)
        if (!(c > 47 && c < 58) && !(c > 64 && c < 91) && !(c > 96 && c < 123) && c != 32)
            return false
    }
    return true
}

// Edita o nome de uma playlist
function editPlaylistName(object){
    var lastName = object.innerHTML
    // HTML que permite editar o nome da playlist
    object.outerHTML = `
    <input class="btn btn-white" id="+" oninput="document.getElementById('++').hidden=true" type="text" maxlength="30" size="30" placeholder="Escolha um nome">
    <p id="++" hidden>Error</p>
    `
    // Campo para digitar o nome
    var newNameField = document.getElementById("+")
    // Mensagem caso haja um erro
    var errorMessage = document.getElementById("++")
    newNameField.defaultValue = lastName

    newNameField.addEventListener("keypress", function(event) {
        // Após o usuário apertar enter, verifica se o nome pode ser alterado
        if (event.key === "Enter") {
            var newName = newNameField.value.trim()
            // Checa se essa playlist já existe
            var name_ID = newName.replaceAll(' ','+')
            var expected_ID1 = `id="${name_ID}"` // Usuário
            var expected_ID2 = `id="${name_ID}*"` // Standard
            var docHTML = document.body.innerHTML

            // Já existia
            if (newName != lastName && (docHTML.includes(expected_ID1) || docHTML.includes(expected_ID2))){
                errorMessage.innerHTML = 'Essa playlist já existe!'
                errorMessage.hidden = false
            }
            // Tem um caractere inválido (acentos também caem nessa categoria)
            else if (!isAlphaNumeric(newName)){
                errorMessage.innerHTML = 'Use apenas números e letras!'
                errorMessage.hidden = false
            }
            // Nome pode ser editado com sucesso
            else {
                var early_ID = `id="${lastName.replaceAll(' ','+')}"`
                // Ajustes estéticos
                this.outerHTML = `
                <p class="playlist_title" onclick="editPlaylistName(this)">${newName}</p>
                <button class="btn btn-white apagarPlaylist"onclick="removePlaylist('${name_ID}')">Apagar playlist</button>
                `
                var newBody = document.body.innerHTML.replaceAll(early_ID, expected_ID1).replaceAll(`<p>${lastName}</p>`, `<p>${newName}</p>`)
                document.body.innerHTML = newBody
                document.getElementById(name_ID).click()

                // Comunica ao servidor
                fetch(`rename_playlist=${lastName}&to=${newName}`, {method: "PATCH"})
                fetch('/forceACK', {method: "GET"})
            }
        }
    })
}

// Mostra a playlist em questão na tela
function displayPlaylist(playlistOBJ, songs) {
    var last_ID = current_ID
    current_ID = playlistOBJ.id
    var correct_ID = (playlistOBJ.id.endsWith('*')) ? (playlistOBJ.id.slice(0,-1)) : (playlistOBJ.id)
    var playlist_name = playlistOBJ.id.replaceAll('+',' ')
    var correct_playlist_name = (playlist_name.endsWith('*')) ? (playlist_name.slice(0,-1)) : (playlist_name)
    songs = songs.split(',')
    var playlist = document.getElementById("current_playlist")
    var song_count = 0
    var edible = false

    // Há um usuário conectado
    if (connected_account.length > 1) {
        // Playlists do usuário
        if (playlistOBJ.innerHTML.includes('**/user_playlists**')){
            // Playlists padrão não podem ser modificadas
            if (document.getElementById('standard_playlists').innerHTML.includes(playlistOBJ.id)) {
                playlist.innerHTML = `
                <div style="display:flex;">
                    <p class="playlist_title">${playlist_name}</p>
                    <button class="btn btn-white apagarPlaylist" onclick="removePlaylist('${playlistOBJ.id}')">Remover dos favoritos</button>
                </div>
                <div style="width:100%">
                    <div style="display:flex; width:100%; padding-top:10px; padding-bottom:10px; border-bottom: 1px solid rgb(40,40,40);">
                        <div style="padding-right:80px;"></div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600;">Titulo</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600">Banda</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600">Album</div>
                    </div>
                </div>
                `
            // As outras podem
            } else {
                // gerar barrinha
                playlist.innerHTML = `
                <div style="display:flex;">
                <p class="playlist_title" onclick="editPlaylistName(this)">${playlist_name}</p>
                <button class="btn btn-white apagarPlaylist" onclick="removePlaylist('${playlistOBJ.id}')">Apagar playlist</button>
                </div>
                <div style="width:100%">
                    <div style="display:flex; width:100%; padding-top:10px; padding-bottom:10px; border-bottom: 1px solid rgb(40,40,40);">
                        <div style="padding-right:80px;"></div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600;">Titulo</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600">Banda</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600">Album</div>
                    </div>
                </div>
                `
                edible = true
            }
        // Standard
        } else if (!playlistOBJ.innerHTML.includes('**/user_liked_playlist**')) {
            // Já foi adicionada
            if (document.getElementById('user_playlists').innerHTML.includes(correct_playlist_name)) {
                playlist.innerHTML = `
                <div style="display:flex;">
                <p class="playlist_title">${correct_playlist_name}</p>
                <button class="btn btn-white apagarPlaylist" onclick="removePlaylist('${correct_ID}')">Remover dos favoritos</button>
                </div>
                <div style="width:100%">
                    <div style="display:flex; width:100%; padding-top:10px; padding-bottom:10px; border-bottom: 1px solid rgb(40,40,40);">
                        <div style="padding-right:80px;"></div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600;">Titulo</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600">Banda</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600">Album</div>
                    </div>
                </div>
                `
            }
            // Pode ser adicionada
            else {
                playlist.innerHTML = `
                <div style="display:flex;">
                <p class="playlist_title">${correct_playlist_name}</p>
                <button class="btn btn-white apagarPlaylist" onclick="addPlaylist('${playlistOBJ.id}')">Adicionar aos favoritos</button>
                </div>
                <div style="width:100%">
                    <div style="display:flex; width:100%; padding-top:10px; padding-bottom:10px; border-bottom: 1px solid rgb(40,40,40);">
                        <div style="padding-right:80px;"></div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600;">Titulo</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600">Banda</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600">Album</div>
                    </div>
                </div>
                `
            }
        // Musicas Curtidas
        } else {
            playlist.innerHTML = `
            <div style="display:flex;">
            <p class="playlist_title">Músicas Curtidas</p>
            </div>
            <div style="width:100%">
                    <div style="display:flex; width:100%; padding-top:10px; padding-bottom:10px; border-bottom: 1px solid rgb(40,40,40);">
                        <div style="padding-right:80px;"></div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600;">Titulo</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600">Banda</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;
                        color: #fff; font-size: 16px; font-weight: 600">Album</div>
                    </div>
                </div>
            `
            edible = true
        }
    // Playlist simples, não pode ser modificada por não estar logado
    } else {
        playlist.innerHTML = `<div style="display:flex;"><p class="playlist_title">${correct_playlist_name}</p></div>`
    }

    // Adicionando as músicas da playlist
    for (var i in songs) {
        if (songs[i].includes('.')) {
            var song_split = songs[i].split("/")
            var band = song_split[0]
            var album = song_split[1]
            var title = song_split[2].split(".")[0]
            
            // Não pode adicionar ou remover músicas
            if (!edible) {
                playlist.innerHTML += `
                <div class="music">
                    <button onclick="playSong('${songs[i]}')" style="width:100%">
                        <div style="display:flex;width:100%;">
                        <img src="${band}/${album}/${band}-${album}-capa.jpg" style="width:35px; height:35px; object-fit:cover; margin-right:25px;">
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;">${title}</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;">${band}</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;">${album}</div>
                        </div>
                    </button>
                </div>
                `
            }
            // Músicas podem ser adicionadas ou removidas
            else {
                playlist.innerHTML += `
                <div class="music">
                    <button onclick="playSong('${songs[i]}')" style="width:100%">
                        <div style="display:flex;width:100%;">
                        <img src="${band}/${album}/${band}-${album}-capa.jpg" style="width:35px; height:35px; object-fit:cover; margin-right:25px;">
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;">${title}</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;">${band}</div>
                        <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;">${album}</div>
                        </div>
                    </button>
                    <button class="btn-add" onclick="removeSong('${songs[i]}'); document.getElementById(current_ID).click(); typing('songs');">Remover</button>
                </div>
                `
            }
            song_count++
        }
    }
    // Não há nenhuma música
    if (song_count == 0)
        playlist.innerHTML += '<br><p>Oops, essa playlist não tem músicas...</p><br>'
    
    if (edible) {
        playlist.innerHTML += `
        <input class="btn btn-transparent" oninput="typing('songs')" id="search_bar_songs" type="text" maxlength="30" size="30" placeholder="Pesquise alguma música"><br>
        <div id="search_songs"></div>
        `
        // Mantém o texto que estava na pesquisa quando uma música é adicionada
        if (current_ID == last_ID) {
            document.getElementById ('search_bar_songs').defaultValue = searched_text_songs
            typing('songs')
        }
    }
    setState('playlist')
}

// Carrega as playlists da página e do usuário
function loadPlaylists(location, elementID) {
    fetch(location, {method: "GET"}).then(r => r.text()).then(resp => {
        var playlists_div = document.getElementById(elementID)
        var id_keeper='' // evita IDs iguais
        playlists_div.innerHTML = ""
        var playlists = JSON.parse(resp)
        for (var playlist in playlists){
            playlist_type = ''
            
            // Playlists padrão, indicadas pelo "*" no final para evitar bugs
            if (location == '/standard_playlists') {
                all_songs = all_songs.concat(playlists[playlist].slice(1))
                playlist_type = 'STANDARD'
                id_keeper = '*'
            }
            // Playlist de músicas curtidas pelo usuário
            else if (location == '/user_liked_playlist') {
                favorite_image = playlists[playlist][0]
                playlist_type = 'LIKED'
            }
            // Playlist genérica do usuário
            else {
                playlist_type = 'USER'
            }

            // Cria o HTML da playlist
            var id = playlist.replaceAll(' ','+')
            playlists_div.innerHTML += `
            <div id="${id+id_keeper}" class="btn-playlist playlist" onclick="displayPlaylist(this,'${playlists[playlist].slice(1)}')">
                <img src="${playlists[playlist][0]}">
                <p>${playlist}</p><br>
                <p hidden>**${playlist_type}**</p>
                <p hidden>**${location}**</p>
            </div>
            `
        }
        // Disponibiliza a playlist para que ela possa ser pesquisada na barra principal
        if (location == '/standard_playlists')
            typing('main bar')
    })
    fetch('/forceACK', {method: "GET"})
    setState('menu')
}

// Logout da conta
function logout() {
    fetch('disconnect_account=' + connected_account, {method: "PATCH"}).then(r => {
        window.location = '/'
    })
    fetch('/forceACK', {method: "GET"})
}

// Página de login
function login() {
    window.location = '/login'
}

// Página de cadastro
function signup() {
    window.location = '/signup'
}

// Busca por correspondências pelo texto pesquisado em todas as músicas
function searchSongCorrespondences(searched_text) {
    searched_text = searched_text.toLowerCase().split(' ')
    var matches = []

    for (var i in all_songs) {
        // Ajustes para obter cada palavra que compõe a banda, álbum e
        // música e englobá-las à pesquisa
        var song_split = all_songs[i].trim().toLowerCase().split("/")
        var band = song_split[0]
        var album = song_split[1]
        var title = song_split[2].split(".")[0]
        words = []
        words = words.concat (band.split(' '))
        words = words.concat (album.split(' '))
        words = words.concat (title.split(' '))
        var contained = true

        for (var s in searched_text) {
            // Esta palavra deve estar completa na busca
            if (s < searched_text.length - 1){
                var someMatch = false
                for (var w in words) { 
                    if (words[w] == searched_text[s]){
                        someMatch = true
                        break
                    }
                }
                if (!someMatch) {
                    contained = false
                    break
                }
            }
            // Palavra ainda sendo escrita
            else {
                var someMatch = false
                for (var w in words) {
                    if (words[w].startsWith (searched_text[s])){
                        someMatch = true
                        break
                    }
                }
                if (!someMatch) {
                    contained = false
                    break
                }
            }
        }

        // Adiciona a música às correspondências
        if (contained)
            matches.push (all_songs[i])
    }
    return matches
}

// Encontra correspondências para o texto digitado pelo usuário
function typing(method) {
    // Pesquisa simples
    if (method == 'songs') {
        var current_playlist = document.getElementById(current_ID)
        var search_songs = document.getElementById ('search_songs')
        searched_text_songs = document.getElementById('search_bar_songs').value
        // Se tiver algo sendo pesquisado, as músicas correspondentes são procuradas
        if (searched_text_songs.length > 0) {
            var song_count = 0
            // Procura correspondências
            var matches = searchSongCorrespondences(searched_text_songs)

            // Mostrando as músicas na tela
            search_songs.innerHTML = ''
            for (var i in matches) {
                // Como é encontrado o nome de arquivo com a correspondência, ajustes devem ser feitos
                if (matches[i].includes('.') && !current_playlist.outerHTML.includes (matches[i])) {
                    var song_split = matches[i].split("/")
                    var band = song_split[0]
                    var album = song_split[1]
                    var title = song_split[2].split(".")[0]

                    search_songs.innerHTML += `
                    <div class="music">
                        <button onclick="playSong('${matches[i]}')" style="width:100%">
                            <div style="display:flex;width:100%;">
                                <img src="${band}/${album}/${band}-${album}-capa.jpg" style="width:35px; height:35px; object-fit:cover; margin-right:25px;">
                                <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;">${title}</div>
                                <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;">${band}</div>
                                <div style="width:30%; display:flex; align-items:center; justify-content:flex-start; overflow:hidden; padding-right:15px;">${album}</div>
                            </div>
                        </button>
                        <button class="btn-add" onclick="addSong('${matches[i]}'); document.getElementById(current_ID).click(); typing('songs');">Adicionar</button>
                    </div>
                    `
                    song_count++
                }
            }
            if (song_count == 0)
                search_songs.innerHTML = '<p>Nenhum resultado foi encontrado na busca</p>'
        // Não mostra música alguma
        } else
            search_songs.innerHTML = ''
    }
    // Pesquisa complexa, envolve álbums
    else {
        var main_search_bar_text = document.getElementById('main_search_bar_text').value
        var main_search_bar = document.getElementById('main_search_bar_results')
        var elements = document.getElementById('standard_playlists').getElementsByClassName('playlist')
        main_search_bar.hidden = main_search_bar_text.length == 0

        // Define inicialmente todas as playlists como invisíveis
        for (var i in elements)
            if ((elements[i].innerHTML || '').length > 0)
                elements[i].style.display = 'none'

        main_search_bar.innerHTML = ''
        if (main_search_bar_text.length > 0){
            var song_count = 0
            var matches = searchSongCorrespondences(main_search_bar_text)
            for (var i in matches) {
                // Como é encontrado o nome de arquivo com a correspondência, ajustes devem ser feitos
                if (matches[i].includes('.')) {
                    var song_split = matches[i].split("/")
                    var band = song_split[0]
                    var album = song_split[1]
                    var title = song_split[2].split(".")[0]
                    
                    // Mostra a playlist na tela com a capa do álbum
                    main_search_bar.innerHTML += `
                    <div class="music">
                        <button type="button" class="btn-musica-pesquisa" onclick="playSong('${matches[i]}')">
                            <img src="${band}/${album}/${band}-${album}-capa.jpg" style="width:35px; height:35px; object-fit:cover; margin-right:25px;">
                            <div class="musica-pesquisa-right" style="display:flex; flex-direction:column; justify-content:flex-start; align-items:center;">
                                <h5 style="font-size:medium">${title}</h5>
                                <h5 style="font-size:small">${band}</h5>
                            </div>
                        </button>
                    </div>
                    `
                    song_count++
                    
                    // Ajustes estéticos
                    for (var j in elements)
                        if ((elements[j].outerHTML || '').includes(matches[i])){
                            elements[j].style.display = 'flex'
                            elements[j].style.flexDirection = 'column'
                        }
                }
            }
            if (song_count == 0)
                main_search_bar.innerHTML = '<p>Nenhum resultado foi encontrado na busca</p>'
        }
    }
}

// Carrega a página
fetch('connected_account', {method: "GET"}).then(r => r.text()).then(resp => {
    connected_account = resp
    user_bar = document.getElementById('user_bar')
    loadPlaylists('/standard_playlists', 'standard_playlists')

    // Verifica se há de fato um usuário no IP conectado
    if (connected_account.length > 1) {
        // Carrega as playlists do usuário
        loadPlaylists('/user_playlists', 'user_playlists')
        loadPlaylists('/user_liked_playlist', 'user_liked_playlist')

        // Mensagem de bem vindo
        user_bar.innerHTML = `
        <button type="button" class="btn btn-transparent">Bem vindo, ${connected_account}</button>
        <button type="button" class="btn" onclick="logout();">Sair</button>
        `

        // Mantém o usuário ativo no servidor mandando confirmação a cada segundo
        setInterval(function () {
            fetch(`keep_connected=${connected_account}`, {method: "PATCH"})
        }, 1000)
    
    // Se não houver, uma aba de login e cadastro é mostrada e as playlists pessoais
    // não ficam visíveis na tela
    } else {
        user_bar.innerHTML = `
        <button type="button" class="btn" onclick="login();">Login</button>
        <button type="button" class="btn" onclick="signup();">Se cadastrar</button>
        `
    }
})
fetch('/forceACK', {method: "GET"})

// Recarrega a página se apertar na seta para voltar do navegador. Foi
// necessário por conta de um bug que não desconectava o usuário se o
// tempo expirasse e ele voltasse no navegador
if (performance.getEntriesByType("navigation")[0].type === "back_forward")
    location.reload(true)

// Define o estado da aplicação, ou seja, qual aba vai estar visível
// e quando vai estar visível
function setState(state){
    document.getElementById("standard_playlists").hidden = true
    document.getElementById("main_search_bar_results").hidden = true
    document.getElementById("user_playlists").hidden = true
    document.getElementById("current_playlist").hidden = true
    if (connected_account.length > 1) {
        document.getElementById('user_buttons').hidden = false
        if (state == 'menu'){
            document.getElementById("standard_playlists").hidden = false
            document.getElementById("main_search_bar_results").hidden = false
        } else if (state == 'liked'){
            document.getElementById("current_playlist").hidden = false
            document.getElementById("user_liked_playlist").getElementsByClassName("playlist")[0].click()
        } else if(state == 'user'){
            document.getElementById("user_playlists").hidden = false
        } else if(state == 'playlist'){
            document.getElementById("current_playlist").hidden = false
        }
    } else {
        document.getElementById('user_buttons').hidden = true
        if (state == 'menu'){
            document.getElementById("standard_playlists").hidden = false
            document.getElementById("main_search_bar_results").hidden = false
        } else if(state == 'playlist'){
            document.getElementById("current_playlist").hidden = false
        }
    }
}