const frisby = require('frisby');
const { MongoClient } = require('mongodb');
const shell = require('shelljs');

const mongoDbUrl = 'mongodb://mongodb:27017/Cookmaster';
const url = 'http://localhost:3000';

describe('6 - Permissões do usuário admin', () => {
  let connection;
  let db;

  beforeAll(async () => {
    connection = await MongoClient.connect(mongoDbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = connection.db('Cookmaster');
    await db.collection('users').deleteMany({});
    await db.collection('recipes').deleteMany({});
    const users = [
      { name: 'admin', email: 'root@email.com', password: 'admin', role: 'admin' }
    ];
    await db.collection('users').insertMany(users);
  });
  
  afterAll(async () => {
    await connection.close();
  });
  
  it('Será validado que o projeto tem um arquivo de seed, com um comando para inserir um usuário root', async () => {
    //shell.exec("mongoContainerID=$(docker ps --format \"{{.ID}} {{.Image}}\" | grep mongo | cut -d ' ' -f1)");
    //shell.exec("cmd=\"mongo $DBNAME --quiet --eval 'DBQuery.shellBatchSize = 100000; DBQuery.prototype._prettyShell = true; $mql'\"");
    //shell.exec("docker exec \"$mongoContainerID\" bash -c \"$cmd\"");
    //const shellDocker = shell.exec('docker -v');
    //const teste = fs.readFileSync('seed.js');
    shell.exec('seed.js');
    //const teste = spawnSync('docker', ['-v']);
    //console.log('teste', teste);
    return frisby
      .post(`${url}/login`,
        {
          email: 'root@email.com',
          password: 'admin',
        })
      .expect('status', 200)
      .then((responseLogin) => {
        const { json } = responseLogin;
        expect(json.token).not.toBeNull();
      });
  });
});

describe('10 - Cadastramento de admin', () => {
  let connection;
  let db;

  beforeAll(async () => {
    connection = await MongoClient.connect(mongoDbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = connection.db('Cookmaster');
  });

  beforeEach(async () => {
    await db.collection('users').deleteMany({});
    await db.collection('recipes').deleteMany({});
    const users = [
      { name: 'admin', email: 'root@email.com', password: 'admin', role: 'admin' },
      { name: 'Erick Jacquin', email: 'erickjacquin@gmail.com', password: '12345678', role: 'user' },
    ];
    await db.collection('users').insertMany(users);
  });

  afterAll(async () => {
    await connection.close();
  });

  it('Será validado que não é possível cadastrar um usuário admin, sem estar autenticado como um usuário admin', async () => {
    let result;

    await frisby
      .post(`${url}/login/`,
        {
          email: 'erickjacquin@gmail.com',
          password: '12345678',
        })
      .expect('status', 200)
      .then((response) => {
        const { body } = response;
        result = JSON.parse(body);
        return frisby
          .setup({
            request: {
              headers: {
                Authorization: result.token,
                'Content-Type': 'application/json',
              },
            },
          })
          .post(`${url}/users/admin`,
            {
              name: 'usuario admin',
              email: 'usuarioadmin@email.com',
              password: 'admin',
            })
          .expect('status', 403)
          .then((responseAdmin) => {
            const { json } = responseAdmin;
            expect(json.message).toBe('Only admins can register new admins');
          });
      });
  });

  it('Será validado que é possível cadastrar um usuário admin', async () => {
    let result;

    await frisby
      .post(`${url}/login/`,
        {
          email: 'root@email.com',
          password: 'admin',
        })
      .expect('status', 200)
      .then((response) => {
        const { body } = response;
        result = JSON.parse(body);
        return frisby
          .setup({
            request: {
              headers: {
                Authorization: result.token,
                'Content-Type': 'application/json',
              },
            },
          })
          .post(`${url}/users/admin`,
            {
              name: 'usuario admin',
              email: 'usuarioadmin@email.com',
              password: 'admin',
            })
          .expect('status', 201)
          .then((responseAdmin) => {
            const { json } = responseAdmin;
            expect(json.user.name).toBe('usuario admin');
            expect(json.user.email).toBe('usuarioadmin@email.com');
            expect(json.user.role).toBe('admin');
          });
      });
  });
});
