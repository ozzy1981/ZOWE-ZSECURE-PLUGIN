import { Component, OnInit, Inject, AfterViewInit, ElementRef } from '@angular/core';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { ZluxPopupManagerService, ZluxErrorSeverity } from '@zlux/widgets';
import { TsoService } from './tso.service';

interface sessionOutput {
  servletKey: string;
  queueID: string;
  ver: string;
  tsoData: tsoDATA[];
  msgData: MsgData[];
  reuse: string;
  timeout: string;
}

interface tsoDATA {
  'TSO MESSAGE': outDATA;
  'TSO PROMPT': outDATA;
}

interface outDATA {
  VERSION: string;
  DATA: string;
  HIDDEN: string;
}


interface MsgData {
  messageText: string;
  messageid: string;
  stackTrack: string;
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css', "../../node_modules/loaders.css/loaders.min.css"],
  providers: [ZluxPopupManagerService]
})


export class AppComponent implements OnInit, AfterViewInit {


  private loggedin = 'false';


  //targetAppId: string = "org.zowe.explorer-mvs"; 
  targetAppId: string = "com.ibm.au.sgdiag";
  callStatus: string = "Status will appear here.";
  actionType: string = "Launch";
  targetMode: string = "PluginCreate";
  parameters: string;
  prevCMDs: any[] = [];
  cmdString: any = "";



  constructor(
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    private popupManager: ZluxPopupManagerService,
    private elementRef: ElementRef,
    private tsoService: TsoService
  ) {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.elementRef.nativeElement.ownerDocument.body.style.backgroundColor = '#774800';
  }


  relog(username: any, password: any, zosmfAddress: string, logonProc: string, characterSet: string, characterPage: string,
    tsoRows: number, tsoColumns: number, regionSize: number, accountInformation: string) {
    this.sendTSOCommand('logoff');
    this.loggedin = 'false';
    this.resetView();
    this.login(username, password, zosmfAddress, logonProc, characterSet, characterPage,
      tsoRows, tsoColumns, regionSize, accountInformation);
  }

  async sendTSOCommand(cmdString: any) {

    if (this.loggedin === 'true') {
      await this.tsoService.sendCommand(cmdString).then(async (response: sessionOutput) => {
        this.log.info('Success! sendTSOCommand' + cmdString);
        await this.tsoService.getMessage(response).then((messageOutput: String) => {

          this.log.info(messageOutput);

        }, (error) => {
          this.log.info('MessageOutput failed' + error);
        })
      }, (error) => {
        this.log.info('Failed sendTSOCommand', error);
      })
      this.log.info('End of sendTSOCommand');
      this.prevCMDs.push(cmdString);
    } else {
      this.log.info('No valid session to issue commands.')
    }
  }


  resetView() {

  }

  async login(username: any, password: any, zosmfAddress: string, logonProc: string, characterSet: string, characterPage: string,
    tsoRows: number, tsoColumns: number, regionSize: number, accountInformation: string) {
    this.log.info(`Attempting to create TSO session on AAZT`);
    this.loggedin = 'attempting';
    await this.tsoService.startTSO(username, password, zosmfAddress, logonProc, characterSet, characterPage,
      tsoRows, tsoColumns, regionSize, accountInformation).then(async () => {
        this.loggedin = 'true';
      }, (error: any) => {
        this.log.info('Failed login', error);
        const errorTitle = 'Error';
        const errorMessage = 'Incorrect login details, please try again';
        const options = {
          blocking: true
        };
        this.popupManager.reportError(ZluxErrorSeverity.ERROR, errorTitle.toString(), errorMessage, options);
        this.loggedin = 'false';
      })
  }

  sendAppRequest(parameters: string) {
    //Opens datasets app and sends the dataset parameters
    const popupOptions = {
      blocking: true
    };
    /*Parameters for Actions could be a number, string, or object. The actual event context of an Action that an App recieves will be an object with attributes filled in via these parameters*/
    try {
      if (this.parameters !== undefined && this.parameters.trim() !== "") {
        parameters = JSON.parse(this.parameters);
      }
    } catch (e) {
      //this.parameters was not JSON
      console.log(parameters);
      console.log("not JSON <-----")
    }
    if (this.targetAppId) {
      let message = '';
      /* 
         With ZLUX, there's a global called ZoweZLUX which holds useful tools. So, a site
         Can determine what actions to take by knowing if it is or isnt embedded in ZLUX via IFrame.
      */
      /* PluginManager can be used to find what Plugins (Apps are a type of Plugin) are part of the current ZLUX instance.
         Once you know that the App you want is present, you can execute Actions on it by using the Dispatcher.
      */
      let dispatcher = ZoweZLUX.dispatcher;
      let pluginManager = ZoweZLUX.pluginManager;
      let plugin = pluginManager.getPlugin(this.targetAppId);
      if (plugin) {
        let type = dispatcher.constants.ActionType[this.actionType];
        let mode = dispatcher.constants.ActionTargetMode[this.targetMode];

        if (type != undefined && mode != undefined) {
          let actionTitle = 'Launch app from sample app';
          let actionID = 'org.zowe.zlux.sample.launch';
          let argumentFormatter = { data: { op: 'deref', source: 'event', path: ['data'] } };
          /*Actions can be made ahead of time, stored and registered at startup, but for example purposes we are making one on-the-fly.
            Actions are also typically associated with Recognizers, which execute an Action when a certain pattern is seen in the running App.
          */
          let action = dispatcher.makeAction(actionID, actionTitle, mode, type, this.targetAppId, argumentFormatter);
          let argumentData = { 'data': (parameters ? parameters : this.parameters) };
          this.log.info((message = 'App request succeeded'));
          this.callStatus = message;
          /*Just because the Action is invoked does not mean the target App will accept it. We've made an Action on the fly,
            So the data could be in any shape under the "data" attribute and it is up to the target App to take action or ignore this request*/
          dispatcher.invokeAction(action, argumentData);
        } else {
          this.log.warn((message = 'Invalid target mode or action type specified'));
        }
      } else {
        this.popupManager.reportError(
          ZluxErrorSeverity.WARNING,
          'Invalid Plugin Identifier',
          `No Plugin found for identifier ${this.targetAppId}`, popupOptions);
      }

      this.callStatus = message;
    }
  }

  // below function is for sending params to another app and opening it
  // openSGDIAG(storageGroup: string) {

  //   this.parameters = 
  //   `
  //   {"type":"load",
  //     "filter":{
  //       "type":"data",
  //       "value":"`+storageGroup+`",
  //       "key":"`+this.servletKey+`",
  //       "reqops":`+JSON.stringify(this.requestOptions)+`
  //   }}
  //   `
  //   ;
  //   console.log("clicked to run SGDIAG against " + storageGroup);
  //   this.sendAppRequest(this.parameters);
  // }



}
