// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as fsx from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { CommandLineAction } from '@microsoft/ts-command-line';
import {
  RushConfiguration,
  Utilities
} from '@microsoft/rush-lib';

import RushCommandLineParser from './RushCommandLineParser';

export default class UnlinkAction extends CommandLineAction {
  private _parser: RushCommandLineParser;
  private _rushConfiguration: RushConfiguration;

  constructor(parser: RushCommandLineParser) {
    super({
      actionVerb: 'unlink',
      summary: 'Delete node_modules symlinks for all projects',
      documentation: 'This removes the symlinks created by the "rush link" command. This is useful for'
       + ' cleaning a repo using "git clean" without accidentally deleting source files, or for using standard NPM'
       + ' commands on a project.'
    });
    this._parser = parser;
    this._rushConfiguration = parser.rushConfiguration;
  }

  protected onDefineParameters(): void {
    // No parameters
  }

  protected onExecute(): void {
    console.log('Starting "rush unlink"' + os.EOL);

    // Delete the flag file if it exists; this will ensure that
    // a full "rush link" is required next time
    Utilities.deleteFile(this._rushConfiguration.rushLinkJsonFilename);

    let didAnything: boolean = false;
    for (const rushProject of this._rushConfiguration.projects) {
      const localModuleFolder: string = path.join(rushProject.projectFolder, 'node_modules');
      if (fsx.existsSync(localModuleFolder)) {
        console.log('Purging ' + localModuleFolder);
        Utilities.dangerouslyDeletePath(localModuleFolder);
        didAnything = true;
      }
    }
    if (!didAnything) {
      console.log('Nothing to do.');
    } else {
      console.log(os.EOL + 'Done.');
    }
  }
}
