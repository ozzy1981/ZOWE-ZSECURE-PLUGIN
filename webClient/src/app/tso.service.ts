import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';

export interface sessionOutput {
  servletKey: string;
  queueID: string;
  ver: string;
  tsoData: tsoDATA[];
  msgData: MsgData[];
  reuse: string;
  timeout: string;
}

export interface tsoDATA {
  'TSO MESSAGE': outDATA;
  'TSO PROMPT': outDATA;
}

export interface outDATA {
  VERSION: string;
  DATA: string;
  HIDDEN: string;
}

export interface MsgData {
  messageText: string;
  messageid: string;
  stackTrack: string;
}


@Injectable({
  providedIn: 'root'
})


export class TsoService {
  requestOptions: any;
  loggedin = 'false';
  tsostarted = 'false';
  servletKey = '';
  return_text = '';
  zosmfAddress: string;

  constructor(
    // @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    private http: Http,
  ) { }

  public startTsoSession(userID: any, userPASS: any, logonProc: string, characterSet: string, characterPage: string,
    tsoRows: number, tsoColumns: number, regionSize: number, accountInformation: string): Observable<sessionOutput> {
    let header = new Headers;
    header.append('Access-Control-Allow-Origin', '*');
    header.append('X-CSRF-ZOSMF-HEADER', 'zosmf');
    header.append('Authorization', 'Basic ' + btoa(userID + ':' + userPASS));
    this.requestOptions = { headers: header }
    const requestParms = 'proc=' + logonProc + '&chset=' + characterSet + '&cpage='
      + characterPage + '&rows=' + tsoRows + '&cols=' + tsoColumns + '&rsize=' + regionSize + '&acct=' + accountInformation;
    return this.http.post('https://' + this.zosmfAddress + '/tsoApp/tso?' + requestParms, '', this.requestOptions).map(res => res.json());
  }

  public sendTsoCommand(servletKey: any, command: string): Observable<sessionOutput> {
    const jobObj: any = {
      "TSO RESPONSE": {
        "VERSION": "0100",
        "DATA": command
      }
    };
    return this.http.put('https://' + this.zosmfAddress + '/tsoApp/tso/' + servletKey, JSON.stringify(jobObj), this.requestOptions).map(res => res.json());
  }

  public getTsoMessage(servletKey: any): Observable<sessionOutput> {
    return this.http.get('https://' + this.zosmfAddress + '/tsoApp/tso/' + servletKey, this.requestOptions).map(res => res.json());
  }

  public stopTsoSession(servletKey: any): Observable<sessionOutput> {
    return this.http.delete('https://' + this.zosmfAddress + '/tsoApp/tso/' + servletKey + '?tsoforcecancel=true', this.requestOptions).map(res => res.json());
  }

  startTSO(username: any, password: any, zosmfAddress: string, logonProc: string, characterSet: string, characterPage: string,
    tsoRows: number, tsoColumns: number, regionSize: number, accountInformation: string) {
    // this.log.info(`Attempting to create TSO session`);
    this.loggedin = 'attempting';
    this.zosmfAddress = zosmfAddress;
    return new Promise(async (resolve, reject) => {
      const session = await this.startTsoSession(username, password, logonProc, characterSet, characterPage,
        tsoRows, tsoColumns, regionSize, accountInformation)
      session.subscribe(
        async res => {
          // this.log.info(`Successful GET, data=${JSON.stringify(res)}`);
          // this.log.info(res);
          // if (res.msgData[0].messageid === 'IZUG1102E') {}
          this.servletKey = res.servletKey;
          if (this.servletKey === null) {
            reject(res.msgData[0].messageText);
          }
          await this.getMessage(res).then(() => {
            this.tsostarted = 'true';
            this.loggedin = 'true';
            resolve(true);
          })
        },
        () => {
          // this.log.info('Session creation failed.');
          this.tsostarted = 'false';
          this.loggedin = 'false';
          reject(false);
        });
    })
  }

  sendCommand(inputCommand: string) {
    // this.log.info(`Attempting to send TSO command to AAZT:` + inputCommand);
    return new Promise((resolve, reject) => {
      const tsoCommand = this.sendTsoCommand(this.servletKey, inputCommand)
      tsoCommand.subscribe(
        res => {
          // this.log.info('Successful Send Command.');
          resolve(res);
        },
        () => {
          // this.log.info('Session creation failed.' + err);
          reject('failed');
        });
    })
  }

  async innerMessage() {
    return new Promise(async (resolve, reject) => {
      let message = await this.getTsoMessage(this.servletKey)
      message.subscribe(
        res => {
          resolve(res);
        },
        () => {
          // this.log.info('Session creation failed.' + err);
          reject('innerMessage timeout');
        });
    })
  }


  async getMessage(res: sessionOutput) {
    // this.log.info(`Attempting to get TSO messages from AAZT`);
    let done = false;
    this.return_text = '';
    let firstLoop = true;
    let message = res;
    return new Promise(async (resolve, reject) => {
      while (!done) {
        if (!firstLoop) {
          await this.innerMessage().then((res: sessionOutput) => {
            message = res;
          }, () => {
            // this.log.info('MessageOutput failed' + error);
          })
        }
        if (message.msgData !== undefined) {
          message.msgData.forEach(element => {
            // console.log('bad things, msgData: ' + JSON.stringify(message.msgData))
            // console.log('bad things, msgData: ' + message.msgData[0].messageText)
            if (element['messageid'] === 'IZUG1126E') {
              done = true;
              console.log('Session does not exist')
              reject(message.msgData[0].messageText)
            }
          })
          done = true;
          reject(message.msgData[0].messageText)
        }
        if (((message.tsoData) !== undefined || (message.tsoData) !== null) && !done) {
          // console.log('processing message text' + JSON.stringify(message))
          message.tsoData.forEach(element => {
            if (element["TSO MESSAGE"]) {
              this.return_text += (element["TSO MESSAGE"].DATA);
            } else if (element["TSO PROMPT"]) {
              if (this.return_text !== '') {
                done = true;
                // this.log.info(`Get Message Complete`);
                resolve(this.return_text);
              }
            } else {
              // no data
            }
          })
        };
        firstLoop = false;
      }
    })
  }

  stopTSO(): void {
    // this.log.info(`Attempting to stop TSO session on AAZT`);
    let endSession = this.stopTsoSession(this.servletKey)
    endSession.subscribe(
      res => {
        // this.log.info(`Successful GET, data=${JSON.stringify(res)}`);
        // this.log.info(res);
        this.servletKey = res.servletKey;
      },
      () => {
        // this.log.info('Session creation failed.');
      });
  }
}
