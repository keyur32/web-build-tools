// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as colors from 'colors';
import * as os from 'os';
import * as fsx from 'fs-extra';
import { CommandLineAction, CommandLineFlagParameter } from '@microsoft/ts-command-line';
import {
  RushConfiguration,
  Utilities,
  Stopwatch
} from '@microsoft/rush-lib';

import InstallManager, { InstallType } from '../utilities/InstallManager';
import LinkManager from '../utilities/LinkManager';
import RushCommandLineParser from './RushCommandLineParser';
import { ApprovedPackagesChecker } from '../utilities/ApprovedPackagesChecker';

export default class GenerateAction extends CommandLineAction {
  private _parser: RushCommandLineParser;
  private _rushConfiguration: RushConfiguration;
  private _lazyParameter: CommandLineFlagParameter;
  private _noLinkParameter: CommandLineFlagParameter;

  constructor(parser: RushCommandLineParser) {
    super({
      actionVerb: 'generate',
      summary: 'Generate a new shrinkwrap file containing the latest semver-compatible versions.',
      documentation: 'Run the "rush generate" command only if: (1) you are setting up a new repo, or'
      + ' (2) you want to upgrade to the latest versions of your dependencies, or (3)'
      + ' you modified a package.json file and "rush install" can\'t find what it needs.'
      + ' The "rush generate" command will do a clean install of your Rush "common" folder,'
      + ' upgrading you to the latest semver-compatible versions of all dependencies.'
      + ' Then, it will create a new shrinkwrap file, which you should commit to source control.'
      + ' Afterwards, it will run "rush link" to create symlinks for all your projects.'
    });
    this._parser = parser;
    this._rushConfiguration = parser.rushConfiguration;
  }

  protected onDefineParameters(): void {
    this._lazyParameter = this.defineFlagParameter({
      parameterLongName: '--lazy',
      parameterShortName: '-l',
      description: 'Use this to save time in situations where you need to run "rush generate" repeatedly'
      + ' while editing package.json files.  It performs a much quicker incremental install,'
      + ' but does not generate a shrinkwrap file; you will still need to run a full "rush generate"'
      + ' (without --lazy) before committing your changes.'
    });
    this._noLinkParameter = this.defineFlagParameter({
      parameterLongName: '--no-link',
      description: 'Do not automatically run the "rush link" action after "rush generate"'
    });
  }

  protected onExecute(): void {
    const stopwatch: Stopwatch = Stopwatch.start();
    const isLazy: boolean = this._lazyParameter.value;

    ApprovedPackagesChecker.rewriteConfigFiles(this._rushConfiguration);

    console.log('Starting "rush generate"' + os.EOL);

    const installManager: InstallManager = new InstallManager(this._rushConfiguration);

    installManager.ensureLocalNpmTool(false);

    installManager.createTempModules();

    // Delete both copies of the shrinkwrap file
    if (fsx.existsSync(this._rushConfiguration.committedShrinkwrapFilename)) {
      console.log(os.EOL + 'Deleting ' + this._rushConfiguration.committedShrinkwrapFilename);
      fsx.unlinkSync(this._rushConfiguration.committedShrinkwrapFilename);
    }
    if (fsx.existsSync(this._rushConfiguration.tempShrinkwrapFilename)) {
      fsx.unlinkSync(this._rushConfiguration.tempShrinkwrapFilename);
    }

    if (isLazy) {
      console.log(colors.green(
        `${os.EOL}Rush is running in "--lazy" mode. ` +
        `You will need to run a normal "rush generate" before committing.`));

      // Do an incremental install
      installManager.installCommonModules(InstallType.Normal);

      console.log(os.EOL + colors.bold('(Skipping "npm shrinkwrap")') + os.EOL);
    } else {
      // Do a clean install
      installManager.installCommonModules(InstallType.ForceClean);

      console.log(os.EOL + colors.bold('Running "npm shrinkwrap"...'));
      const npmArgs: string [] = ['shrinkwrap'];
      installManager.pushConfigurationNpmArgs(npmArgs);
      Utilities.executeCommand(this._rushConfiguration.npmToolFilename,
        npmArgs, this._rushConfiguration.commonTempFolder);
      console.log('"npm shrinkwrap" completed' + os.EOL);

      // Copy (or delete) common\temp\npm-shrinkwrap.json --> common\npm-shrinkwrap.json
      installManager.syncFile(this._rushConfiguration.tempShrinkwrapFilename,
        this._rushConfiguration.committedShrinkwrapFilename);

      // The flag file is normally created by installCommonModules(), but "rush install" will
      // compare its timestamp against the shrinkwrap file.  Since we just generated a new
      // npm-shrinkwrap file, it's safe to bump the timestamp, which ensures that "rush install"
      // won't do anything immediately after "rush generate".  This is a minor performance
      // optimization, but it helps people to understand the semantics of the commands.
      if (fsx.existsSync(installManager.commonNodeModulesMarkerFilename)) {
        fsx.writeFileSync(installManager.commonNodeModulesMarkerFilename, '');
      } else {
        // Sanity check -- since we requested a clean install above, this should never occur
        throw new Error('The install flag file is missing');
      }
    }

    stopwatch.stop();
    console.log(os.EOL + colors.green(`Rush generate finished successfully. (${stopwatch.toString()})`));

    if (!this._noLinkParameter.value) {
      const linkManager: LinkManager = new LinkManager(this._rushConfiguration);
      // NOTE: Setting force=true here shouldn't be strictly necessary, since installCommonModules()
      // above should have already deleted the marker file, but it doesn't hurt to be explicit.
      this._parser.catchSyncErrors(linkManager.createSymlinksForProjects(true));
    } else {
      console.log(os.EOL + 'Next you should probably run: "rush link"');
    }
  }
}
