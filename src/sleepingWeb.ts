import express, { Express } from 'express';
import { engine } from 'express-handlebars';
import * as http from 'http';
import path from 'path';
import { SleepingContainer } from './sleepingContainer';
import { ServerStatus } from './sleepingHelper';
import { getLogger, LoggerType } from './sleepingLogger';
import { ISleepingServer } from "./sleepingServerInterface";
import { DefaultFavIconString, Settings } from "./sleepingSettings";
import { PlayerConnectionCallBackType } from './sleepingTypes';


export class SleepingWeb implements ISleepingServer {
  settings: Settings;
  sleepingContainer: SleepingContainer;
  playerConnectionCallBack: PlayerConnectionCallBackType;
  logger: LoggerType;
  app: Express;
  server?: http.Server;

  constructor(settings: Settings, playerConnectionCallBack: PlayerConnectionCallBackType, sleepingContainer: SleepingContainer) {
    this.settings = settings;
    this.playerConnectionCallBack = playerConnectionCallBack;
    this.sleepingContainer = sleepingContainer;
    this.logger = getLogger();
    this.app = express();
  }

  init = async () => {

    this.app.engine('hbs', engine({
      defaultLayout: 'main',
      layoutsDir: path.join(__dirname, './views/layouts/'),
      extname: '.hbs',
      helpers: {
        title: () => { return this.settings.serverName },
        favIcon: () => { return this.settings.favIcon || DefaultFavIconString },
      }
    }));

    this.app.set('view engine', 'hbs');
    this.app.use(express.static(path.join(__dirname, './views')));

    this.app.get('/', (req, res) => {
      res.render(path.join(__dirname, './views/home'), { message: this.settings.loginMessage });
    });

    this.app.post('/wakeup', async (req, res) => {
      const currentStatus = await this.sleepingContainer.getStatus();
      if (currentStatus === ServerStatus.Sleeping) {
        this.playerConnectionCallBack('A WebUser');
        res.send('received');
      } else {
        this.logger.info(`Wake up server was already running *:${currentStatus}`);
      }
    })

    this.app.get('/status', async (req, res) => {
      const status = await this.sleepingContainer.getStatus()
      res.json(status);
    });

    this.server = this.app.listen(this.settings.webPort, () => {
      this.logger.info(`Starting web server on *:${this.settings.webPort}`);
    })
  };

  close = async () => {
    if (this.server) {
      this.server.close();
    }
  };

}