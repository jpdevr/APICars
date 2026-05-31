# Car Guessing Game

## 1. Descrição
O **Car Guessing Game** é um jogo web de adivinhação de carros baseado em pistas. A proposta é apresentar informações progressivas sobre um veículo e desafiar o jogador a descobrir o modelo correto.

## 2. Objetivo do projeto
O objetivo é criar uma aplicação interativa em que o jogador tenta acertar o carro correto com base em dicas como marca, modelo, ano, país de origem, categoria, tipo de veículo, motorização, tração, fabricante e outras características relevantes.

A experiência foi pensada para ser divertida, dinâmica e desafiadora tanto para jogadores casuais quanto para entusiastas automotivos.

## 3. Endpoints criados

### `POST /api/game/classic/guess`
Envia uma tentativa de resposta no modo clássico.

Body:

```json
{
  "carId": "665abc123"
}
```

### `GET /api/cars/search?query=[EXEMPLO]`
Busca carros por texto (marca ou nome), retornando sugestões para o jogo.

Exemplo:

```http
GET /api/cars/search?query=Ferrari
```

## 4. Funcionalidades previstas
- Cadastro e listagem de carros na base de dados;
- Exibição de pistas sobre o veículo;
- Sistema de tentativa de resposta;
- Validação se o carro escolhido está correto ou não;
- Possibilidade de usar diferentes categorias de carros;
- Integração entre frontend e backend;
- Armazenamento dos dados em banco de dados;
- Futuramente: sistema de pontuação, ranking, dificuldade e histórico de partidas.

## 5. Tecnologias
- Frontend: Angular, HTML, SCSS e TypeScript;
- Backend: Java com Spring Boot;
- Banco de dados: MongoDB;
- API REST para comunicação entre frontend e backend.

## 6. Estrutura do projeto
- `FrontEnd/carsdle`: interface do jogo (frontend);
- `BackEndAPI/APICars`: API, regras de negócio e comunicação com banco de dados (backend).

## 7. Como executar o projeto

### Backend (Spring Boot)
1. Acesse a pasta:
   - `cd BackEndAPI/APICars`
2. Crie o arquivo `.env` com base em `.env.example` e ajuste as variáveis (MongoDB, porta e CORS).
3. Execute a aplicação:
   - Windows: `mvnw.cmd spring-boot:run`
   - Linux/macOS: `./mvnw spring-boot:run`

### Frontend (Angular)
1. Acesse a pasta:
   - `cd FrontEnd/carsdle`
2. Instale as dependências:
   - `npm install`
3. Inicie o servidor de desenvolvimento:
   - `npm start`

### Banco de dados (MongoDB)
1. Garanta que o MongoDB esteja em execução.
2. Configure os dados de conexão no `.env` do backend, com base no `.env.example`.

## 8. Status do projeto
Projeto em desenvolvimento.
