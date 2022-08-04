import socket

index = open('index.html', 'r',encoding="utf8")
indexPg = index.read()

ip ='0.0.0.0'
porta = 8080

# definindo server para IP TCP
try:

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    server.bind((ip, porta))

    # configurando para até 3 maquinas usarem
    server.listen(3)

    print(f'Estamos online em {ip} e com porta {porta} ')



    # loop para receber dados do cliente
    while True:
        (host, client) = server.accept()

        # print do ip do cliente
        print(f"Connecting response in IP: {client[0]}")
        print(f"Connecting response by CientID: {client[1]}")
        print(f"Object Requested by: {host}")

        #separando 2000 bytes de memória para interação cliente-servidor
        dtResp = host.recv(2000)

        #response sloicitando metodo GET para HTTP 1.0
        response = dtResp.split(b' ')

        if response[0] == b'GET':

            if response[1] == b'/':
                returned = ('HTTP/1.1 200 OK\r\n' + 'Content-Type: text/html\r\n' + 'Content-Length: ' + str(len(indexPg)) + '\r\n\r\n' + (indexPg))
                returned = str.encode(returned)
                host.sendall(returned)

    # código para passagem de comando via terminal e netcat
    #  saida = str(response)
    #         saida = saida[1:]
    #         saida = saida.replace('\\n','')
    #         saida = saida.replace('\'','')
    #         if saida == "dir":
    #             system("dir")
    #
    #         elif saida == "ls":
    #             system("ls")
    #
    #         elif saida == "sair do servidor":
    #             print("processo no servidor finalizado")
    #             server.close()
    #             break
    #         print(saida)





except KeyboardInterrupt:
    print(' O servidor está sendo fechado')
    host.close()
    server.close()