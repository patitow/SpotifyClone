import socket
import json
import os
from datetime import datetime as dt

# Atualiza o arquivo .json com a informação
def writeOnJson(location, info):
    with open(location, 'w') as f:
        json.dump(info, f, indent=4)
        f.close()

# Retorna apenas o nome do arquivo, ignorando seus diretórios
def getFilename(path):
    return path[path.rfind('/')+1:] if '/' in path else path

# Retorna a extensão de um determinado arquivo
def getExtension(filename):
    return filename[filename.rfind('.')+1:] if '.' in filename else ''

# Gera as respostas HTTP para cada arquivo presente no diretório
# passado como argumento
def getHTTPResponses(dir):
    http_file_responses = {}
    for root, _, files in os.walk(dir):
        for file in files:
            # Encontrando o path e a extensão
            path = os.path.join (root, file)
            extension = getExtension(file)

            # Imagem
            if extension in ['jpg','jpeg','png','ico','svg','gif']:
                data = open(path, 'rb').read()
                if extension == 'svg':
                    extension += '+xml'
                resp = (
                    f'HTTP/1.1 200 OK\r\n'
                    f'Content-Type: image/{extension}\r\n'
                    f'Content-Length: {len(data)}\r\n\r\n'
                )
                http_file_responses[file] = str.encode(resp) + data
            
            # Áudio
            elif extension in ['wav','mp3','ogg']:
                data = open(path, 'rb').read()
                resp = (
                    f'HTTP/1.1 200 OK\r\n'
                    f'Content-Type: audio/{extension}\r\n'
                    f'Accept-Ranges: bytes\r\nContent-Length: {len(data)}\r\n'
                    f'Content-Range: bytes 0-{len(data)-1}/{len(data)}\r\n\r\n'
                )
                if 'bands' in path:
                    audio_identity = tuple(os.path.normpath(path).split('/')[-3:])
                    band, album, song = audio_identity
                    http_file_responses[f'{band}/{album}/{song}'] = str.encode(resp) + data
                http_file_responses[file] = str.encode(resp) + data

            # CSS
            elif extension in ['css']:
                data = open(path, 'r').read()
                resp = (
                    f'HTTP/1.1 200 OK\r\n'
                    f'Content-Type: text/css\r\n'
                    f'Content-Length: {len(data)}\r\n\r\n'
                )
                http_file_responses[file] = str.encode(resp + data)
            
            # Javascript
            elif extension in ['js']:
                data = open(path, 'r').read()    
                resp = (
                    f'HTTP/1.1 200 OK\r\n'
                    f'Content-Type: text/javascript\r\n'
                    f'Content-Length: {len(data)}\r\n\r\n'
                )
                http_file_responses[file] = str.encode(resp + data, 'latin1')
            
            # HTML
            elif extension in ['html']:
                data = open(path, 'r').read()
                # Nomes alternativos com e sem ".html", além do caso do "index.html"
                alt_names = [file, file[:-5]] + ([''] if file == 'index.html' else [])
                resp = (
                    f'HTTP/1.1 200 OK\r\n'
                    f'Content-Type: text/html\r\n'
                    f'Content-Length: {len(data)}\r\n\r\n'
                )
                for name in alt_names:
                    http_file_responses[name] = str.encode(resp + data, 'latin1')
    
    # Dict contendo os arquivos e suas versões codificadas
    return http_file_responses

# Atalho para evitar repetição no código, pois é usado em muitas
# operações de resposta do servidor
def sendTextResponseHTTP(socket, response, encoding='UTF-8'):
    response = str.encode(response)
    resp = (
        f'HTTP/1.1 200 OK\r\n'
        f'Content-Type: text/plain\r\n'
        f'Content-Length: {len(response)}\r\n\r\n'
    )
    socket.sendall(str.encode(resp, encoding) + response)

# Remove os usuários que passaram muito tempo inativos e em seguida
# atualiza o arquivo .json com os dados
def removeOfflineUsers():
    updateFile = False
    for user in user_data:
        if user_data[user]['status'] == 'online':
            last_access = dt.fromisoformat(user_data[user]['last access'])
            time_since_active = dt.now() - last_access
            time_since_active = time_since_active.total_seconds() / 60
            if time_since_active > INACTIVITY_MINUTES:
                updateFile = True
                user_data[user]['status'] = 'offline'
                print(f'{user} was disconnected due to innactivity')
    if updateFile:
        writeOnJson('data/users.json', user_data)

# Checa se uma string contém ao menos uma das substrings da lista
def stringContainsAny(string, substrings):
    for s in substrings:
        if s in string:
            return True
    return False

# Retorna o usuário que está logado no IP, é útil para quando a página é
# recarregada ou verificar se pode ser feito login ou cadastro
def loggedUser(client_IP):
    username = '0'
    for user in user_data:
        if user_data[user]['status'] == 'online' and user_data[user]['last IP'] == client_IP:
            username = user
            break
    return username

INACTIVITY_MINUTES = 5
http_file_responses = getHTTPResponses(os.getcwd())

# Adicionando músicas em playlists padrão
standard_playlists = {}
songs = []
for file in http_file_responses.keys():
    if stringContainsAny(file, ['wav','mp3','ogg']) and '/' in file:
        band, album, _ = tuple(file.split('/'))
        name = f'{album} - {band}'

        # Se o álbum já existe, então a música só é adicionada
        if name in standard_playlists.keys():
            standard_playlists[name] += [file]
        
        # Se não existe, o álbum é criado junto com uma imagem (capa) que
        # vai representá-lo na tela do spotify
        else:
            album_dir = 'data/bands/' + file[:file.rfind('/')]
            standard_playlists[name] = ['0']
            for cover in os.listdir(album_dir):
                extension = getExtension(cover)
                if extension in ['jpg','jpeg','png','ico','svg','gif']:
                    standard_playlists[name][0] = getFilename(cover)
            standard_playlists[name] += [file]

# Checa se já existe um arquivo .json que guarda as informações dos usuários
# e cria um caso não tenha
if not os.path.exists('data/users.json'):
    writeOnJson('data/users.json', {})

user_data = json.load(open('data/users.json'))
removeOfflineUsers()

# Remove os usuários quando o servidor é derrubado, este trecho foi desativado
# para facilitar os testes e a demonstração do código
'''for user in user_data:
    user_data[user]['status'] = 'offline'
writeOnJson('data/users.json', user_data)'''

try:
    # Iniciando o welcome socket
    welcome_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    welcome_socket.bind(('', 8090))
    welcome_socket.listen(5)
    print('Server online')

    while True:
        # Redirecionamento do cliente para se comunicar com o web socket
        web_socket, _ = welcome_socket.accept()
        data = web_socket.recv(2000).split(b' ')
        client_IP = web_socket.getpeername()[0]

        ### GET is used to request data from a specified resource. ###
        if data[0] == b'GET':
            request = data[1].decode('utf-8')[1:].replace('%20', ' ')
            filename = getFilename(request)

            # Busca por um arquivo de mesmo nome no servidor
            if filename in http_file_responses.keys ():
                print(f'{client_IP} requested {filename}')
                web_socket.sendall(http_file_responses[filename])
            
            # Encontra a conta ativa no IP procurado
            elif request == 'connected_account':
                # Desconecta usuários que passaram muito tempo offline
                removeOfflineUsers()
                username = loggedUser(client_IP)
                sendTextResponseHTTP(web_socket, username)
            
            # Para o caso de algum arquivo não ter carregado completamente
            elif request == 'forceACK':
                web_socket.sendall(b'HTTP/1.1 200 OK\r\n\r\n')

            # A lista de playlists padrão
            elif request == 'standard_playlists':
                sendTextResponseHTTP(web_socket, json.dumps(standard_playlists))

            # A lista de playlists do usuário conectado
            elif request == 'user_playlists':
                playlists = {}
                username = loggedUser(client_IP)
                if username in user_data.keys():
                    user_playlists = user_data[username]['playlists']
                    for playlist in user_playlists.keys():
                        if playlist != '*':
                            playlists[playlist] = user_playlists[playlist]
                sendTextResponseHTTP(web_socket, json.dumps(playlists))

            # A playlist de músicas curtidas pelo usuário conectado
            elif request == 'user_liked_playlist':
                playlists = {}
                username = loggedUser(client_IP)
                if username in user_data.keys():
                    user_playlists = user_data[username]['playlists']
                    for playlist in user_playlists.keys():
                        if playlist == '*':
                            playlists['liked songs'] = user_playlists[playlist]
                            break
                sendTextResponseHTTP(web_socket, json.dumps(playlists))

            # Arquivo não foi encontrado
            else:
                print(f'{client_IP} tried to connect to nonexisting {filename}')
                web_socket.sendall(http_file_responses['404.html'])

        ### POST is used to send data to a server to create/update a resource. ###
        elif data[0] == b'POST':
            form = data[1].decode('utf-8')[1:].replace('%20', ' ')
            # Logar
            if form.startswith('form=login'):
                try:
                    username, password = form.split('&')[1:3]
                    username = username.split('=')[1]
                    password = password.split('=')[1]
                except:
                    username, password = '0', '0'
                username_correct = username in user_data.keys()
                password_correct = username_correct and user_data[username]['password'] == password
                online = (user_data[username]['status'] == 'online') if username_correct else False

                # A conta já está logada
                if online:
                    print(f'{client_IP} tried to log to a logged account')
                    response = 'already_logged'

                # O usuário pode iniciar a conexão
                elif username_correct and password_correct:
                    user_data[username]['last IP'] = client_IP
                    user_data[username]['last access'] = dt.now().isoformat()
                    user_data[username]['status'] = 'online'
                    writeOnJson('data/users.json', user_data)
                    print(f'{client_IP} just logged to {username}')
                    response = 'welcome'

                # Senha incorreta
                elif username_correct:
                    print(f'{client_IP} tried to log with wrong password')
                    response = 'wrong_pass'

                # Esta conta não existe
                else:
                    print(f'{client_IP} tried to log in a nonexistent user')
                    response = 'non_existent'

                # Resposta
                sendTextResponseHTTP(web_socket, response)

            # Criar conta
            elif form.startswith('form=signup'):
                try:
                    username, password = form.split('&')[1:3]
                    username = username.split('=')[1]
                    password = password.split('=')[1]
                except:
                    username, password = '0', '0'
                username_exists = username in user_data.keys()

                # Esta conta já existe
                if username_exists:
                    print(f'{client_IP} tried to create an existing account')
                    response = 'already_exists'

                # Cria uma nova conta, atualiza o .json e mantém online
                else:
                    user_data[username] = {
                        'password': password,
                        'last IP': client_IP,
                        'last access': dt.now().isoformat(),
                        'status': 'online',
                        'playlists': {
                            '*': ['favorite songs.jpg']
                        }
                    }
                    writeOnJson('data/users.json', user_data)
                    print(f'{client_IP} just logged to {username}')
                    response = 'welcome'

                # Resposta
                sendTextResponseHTTP(web_socket, response)

        ### The PATCH method is used to apply partial modifications to a resource. ###
        elif data[0] == b'PATCH':
            information = data[1].decode('utf-8')[1:].replace('%20', ' ')

            # Adiciona uma playlist para o usuário
            if information.startswith ('add_playlist='):
                # Busca pela imagem da playlist após o nome
                if '&' in information:
                    information = information.split('&')
                    playlist_name = information[0].split('=')[1]
                    playlist_image = information[1].split('=')[1]

                # Se não achar, atribui uma por default
                else:
                    playlist_name = information.split('=')[1]
                    playlist_image = 'favorite songs.jpg'

                username = loggedUser(client_IP)
                if username in user_data.keys ():
                    # Playlist padrão
                    if playlist_name in standard_playlists.keys ():
                        user_data[username]['playlists'][playlist_name] = standard_playlists[playlist_name]
                    # Playlist criada
                    else:
                        user_data[username]['playlists'][playlist_name] = [playlist_image]
                    writeOnJson('data/users.json', user_data)
                    print (f'Added playlist {playlist_name} to {username}')

            # Renomeia uma playlist do usuário
            elif information.startswith ('rename_playlist='):
                information = information.split('&')
                last_name = information[0].split('=')[1]
                new_name = information[1].split('=')[1]
                username = loggedUser(client_IP)
                if username in user_data.keys ():
                    if last_name in user_data[username]['playlists'].keys ():
                        user_data[username]['playlists'][new_name] = user_data[username]['playlists'].pop(last_name)
                        writeOnJson('data/users.json', user_data)
                        print (f'Renamed playlist ({last_name}) -> ({new_name}) for {username}')

            # Remove uma playlist para o usuário
            elif information.startswith ('remove_playlist='):
                username = loggedUser(client_IP)
                if username in user_data.keys ():
                    playlist_name = information.split('=')[1]
                    if playlist_name in user_data[username]['playlists'].keys ():
                        del user_data[username]['playlists'][playlist_name]
                        writeOnJson('data/users.json', user_data)
                        print (f'Removed playlist {playlist_name} from {username}')
            
            # Adiciona uma música para o usuário em uma playlist específica
            elif information.startswith ('add_song='):
                information = information.split('&')
                song = information[0].split('=')[1]
                playlist = information[1].split('=')[1]
                if playlist == 'liked songs':
                    playlist = '*'
                username = loggedUser(client_IP)
                if username in user_data.keys ():
                    if playlist in user_data[username]['playlists'].keys ():
                        if not song in user_data[username]['playlists'][playlist]:
                            user_data[username]['playlists'][playlist] += [song]
                            writeOnJson('data/users.json', user_data)
                            print (f'Added song {song} to {playlist} of user {username}')

            # Remove uma música de uma playlist específica para o usuário
            elif information.startswith ('remove_song='):
                information = information.split('&')
                song = information[0].split('=')[1]
                playlist = information[1].split('=')[1]
                username = loggedUser(client_IP)
                if username in user_data.keys ():
                    if playlist in user_data[username]['playlists'].keys ():
                        if song in user_data[username]['playlists'][playlist]:
                            user_data[username]['playlists'][playlist].remove(song)
                            writeOnJson('data/users.json', user_data)
                            print (f'Removed song {song} from {playlist} of user {username}')
            
            # Desconecta um usuário
            elif information.startswith('disconnect_account='):
                username = information.split('=')[1]
                if username == loggedUser(client_IP):
                    user_data[username]['last access'] = dt.now().isoformat()
                    user_data[username]['status'] = 'offline'
                    writeOnJson('data/users.json', user_data)
                    print(f'{client_IP} just logged out from {username}')

            # Manter conexão viva com pulsos intervalados
            elif information.startswith('keep_connected='):
                username = information.split('=')[1]
                if username == loggedUser(client_IP):
                    user_data[username]['last access'] = dt.now().isoformat()
                    user_data[username]['status'] = 'online'
                    writeOnJson('data/users.json', user_data)
            
            sendTextResponseHTTP(web_socket, '')


except KeyboardInterrupt:
    print(" terminado pelo usuario")
    web_socket.close()
    welcome_socket.close()
