// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as os from 'os';
import * as path from 'path';
import * as colors from 'colors';
import * as wordwrap from 'wordwrap';
import { CommandLineParser, CommandLineFlagParameter } from '@microsoft/ts-command-line';
import {
  RushConfiguration,
  Utilities
} from '@microsoft/rush-lib';

import BuildAction from './BuildAction';
import ChangeAction from './ChangeAction';
import CheckAction from './CheckAction';
import GenerateAction from './GenerateAction';
import InstallAction from './InstallAction';
import LinkAction from './LinkAction';
import PublishAction from './PublishAction';
import RebuildAction from './RebuildAction';
import UnlinkAction from './UnlinkAction';
import ScanAction from './ScanAction';

import Telemetry from '../utilities/Telemetry';

export default class RushCommandLineParser extends CommandLineParser {
  public rushConfiguration: RushConfiguration;
  public telemetry: Telemetry;
  private _debugParameter: CommandLineFlagParameter;

  constructor() {
    super({
      toolFilename: 'rush',
      toolDescription: 'Rush helps you to manage a collection of NPM'
      + ' projects.  Rush collects the dependencies for all projects to perform a minimal install,'
      + ' detects which projects can be locally linked, and performs a fast parallel'
      + ' build according to the detected dependency graph.  If you want to decompose'
      + ' your monolithic project into many small packages but are afraid of the dreaded'
      + ' NPM progress bar, Rush is for you.'
    });
    this._initialize();
    this._populateActions();
  }

  public catchSyncErrors(promise: Promise<void>): void {
    promise.catch((error: Error) => {
      this._exitAndReportError(error);
    });
  }

  public exitWithError(): void {
    try {
      this.telemetry.flush();
    } finally {
      process.exit(1);
    }
  }

  protected onDefineParameters(): void {
    this._debugParameter = this.defineFlagParameter({
      parameterLongName: '--debug',
      parameterShortName: '-d',
      description: 'Show the full call stack if an error occurs while executing the tool'
    });
  }

  protected onExecute(): void {
    if (this._debugParameter.value) {
      // For debugging, don't catch any exceptions; show the full call stack
      super.onExecute();
      this.telemetry.flush();
    } else {
      try {
        super.onExecute();
        this.telemetry.flush();
      } catch (error) {
        this._exitAndReportError(error);
      }
    }
  }

  private _initialize(): void {
    try {
      this.rushConfiguration = RushConfiguration.loadFromDefaultLocation();
      this.telemetry = new Telemetry(this.rushConfiguration);
      this._ensureEnvironment();
    } catch (error) {
      this._exitAndReportError(error);
    }
  }

  private _populateActions(): void {
    try {
      this.addAction(new BuildAction(this));
      this.addAction(new ChangeAction(this));
      this.addAction(new CheckAction(this));
      this.addAction(new GenerateAction(this));
      this.addAction(new InstallAction(this));
      this.addAction(new LinkAction(this));
      this.addAction(new PublishAction(this));
      this.addAction(new RebuildAction(this));
      this.addAction(new ScanAction(this));
      this.addAction(new UnlinkAction(this));
    } catch (error) {
      this._exitAndReportError(error);
    }
  }

  private _ensureEnvironment(): void {
    /* tslint:disable-next-line:no-string-literal */
    let environmentPath: string = process.env['PATH'];
    environmentPath = path.join(this.rushConfiguration.commonTempFolder, 'node_modules', '.bin') +
      path.delimiter + environmentPath;
    /* tslint:disable-next-line:no-string-literal */
    process.env['PATH'] = environmentPath;
  }

  private _exitAndReportError(error: Error): void {
    if (this._debugParameter.value) {
      // If catchSyncErrors() called this, then show a call stack similar to what NodeJS
      // would show for an uncaught error
      console.error(os.EOL + error.stack);
    } else {
      const prefix: string = 'ERROR: ';
      const wrap: (textToWrap: string) => string = wordwrap.soft(prefix.length, Utilities.getConsoleWidth());
      console.error(os.EOL + colors.red(prefix + wrap(error.message).trim()));
    }
    this.exitWithError();
  }
}
