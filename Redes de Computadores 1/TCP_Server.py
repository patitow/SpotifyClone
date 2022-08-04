import socket
import json
import os
from datetime import datetime as dt
        
# Checking users file
if not 'users.json' in os.listdir(os.getcwd()):
    with open('users.json', 'w') as f:
        json.dump({}, f)

user_list = json.load(open('users.json'))
online_users = []

# Existent pages and their HTML
website_dict = {
    'index': open('index.html', 'r').read(),
    'login': open('login.html', 'r').read(),
    'logged': open('logged.html', 'r').read()
}

# Server
try:
    welcome_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    welcome_socket.bind(('', 8080))
    welcome_socket.listen(5)

    while True:
        web_socket, _ = welcome_socket.accept()
        data = web_socket.recv(2000).split(b' ')

        if data[0] == b'GET':
            client_IP = web_socket.getpeername()[0]

            # Returns a page existent on the website
            if data[1] in [str.encode('/' + page) for page in website_dict.keys()]:
                html = website_dict[data[1].decode('utf-8')[1:]]
                resp = f'HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {len(html)}\r\n\r\n{html}'
                web_socket.sendall(str.encode(resp))

            # Favicon
            elif data[1] == b'/favicon.ico':
                figure = open(data[1].decode('utf-8')[1:], 'rb').read()
                resp = f'HTTP/1.0 200 OK\r\nContent-Type: image/ico\r\nContent-Length: {len(figure)}\r\n\r\n'
                web_socket.sendall(str.encode(resp) + figure)
            
            # Client user requests
            else:
                request = data[1].decode('utf-8')[1:]
                request = request.replace('%7B', '{')
                request = request.replace('%7D', '}')
                request = request.replace('%20', ' ')

                # Login
                if request.find('login_u{') == 0 and request.find('}p{') > 0:
                    ui, uf = request.index('u{') + 2, request.index('}p')
                    username = request[ui:uf]
                    pi, pf = request.index('p{') + 2, request.rfind('}')
                    password = request[pi:pf]
                    
                    if username in online_users:
                        response = b'already_logged'
                    elif username in user_list.keys() and user_list[username]['password'] == password:
                        online_users.append(username)
                        response = b'welcome'
                        user_list[username]['last IP'] = client_IP
                        user_list[username]['last access'] = dt.now().isoformat()
                    elif username in user_list.keys():
                        response = b'wrong_password'
                    else:
                        response = b'non_existent'
                    web_socket.sendall(b'HTTP/1.1 200 OK\r\n\r\n' + response)

                # Signup
                elif request.find('signup_u{') == 0 and request.find('}p{') > 0:
                    ui, uf = request.index('u{') + 2, request.index('}p')
                    username = request[ui:uf]
                    pi, pf = request.index('p{') + 2, request.rfind('}')
                    password = request[pi:pf]
                    
                    if username in online_users or username in user_list.keys():
                        response = b'already_exists'
                    elif username.find('%') >= 0 or password.find('%') >= 0:
                        response = b'invalid_characters'
                    else:
                        user_list[username] = {
                            'password': password,
                            'last IP': client_IP,
                            'last access': dt.now().isoformat()
                        }
                        with open('users.json', 'w') as f:
                            json.dump(user_list, f)
                            f.close()
                        online_users.append(username)
                        response = b'welcome'
                    web_socket.sendall(b'HTTP/1.1 200 OK\r\n\r\n' + response)
                
                elif request == 'update':
                    web_socket.sendall(b'HTTP/1.1 200 OK\r\n\r\n')
                
                elif request == 'logout_u':
                    for user in online_users:
                        if user_list[user]['last IP'] == client_IP:
                            online_users.remove(user)
                            break
                    web_socket.sendall(b'HTTP/1.1 200 OK\r\n\r\n')

                elif request == 'active_user':
                    username = b''
                    for user in online_users:
                        if client_IP == user_list[user]['last IP']:
                            current_access = dt.now()
                            last_access = dt.fromisoformat(user_list[user]['last access'])
                            minutes_enlapsed = divmod((current_access - last_access).total_seconds(), 60)[0]
                            print('passed', minutes_enlapsed)
                            username = str.encode(user)
                            break
                    web_socket.sendall(b'HTTP/1.1 200 OK\r\n\r\n' + username)

                print('are online:', online_users)
            print(f'{client_IP} connected to {data[1]}')

except KeyboardInterrupt:
    print(" terminado pelo usuario")
    web_socket.close()
    welcome_socket.close()