/// <reference types="mocha" />

import { assert } from 'chai';
import * as ts from 'typescript';
import * as fsx from 'fs-extra';
import * as path from 'path';
import Extractor from '../../Extractor';
import ApiFileGenerator from '../../generators/ApiFileGenerator';

/* tslint:disable:no-function-expression - Mocha uses a poorly scoped "this" pointer */

function assertFileMatchesExpected(actualFilename: string, expectedFilename: string): void {
  const actualContent: string = fsx.readFileSync(actualFilename).toString('utf8');
  const expectedContent: string = fsx.readFileSync(expectedFilename).toString('utf8');

  assert(ApiFileGenerator.areEquivalentApiFileContents(actualContent, expectedContent),
    'The file content does not match the expected value:'
    + '\nEXPECTED: ' + expectedFilename
    + '\nACTUAL: ' + actualFilename);
}

let capturedErrors: {
  message: string;
  fileName: string;
  lineNumber: number;
}[] = [];

function testErrorHandler(message: string, fileName: string, lineNumber: number): void {
  capturedErrors.push({ message, fileName, lineNumber });
}

describe('ApiFileGenerator tests', function (): void {
  this.timeout(10000);

  describe('Basic Tests', function (): void {
    it('Example 1', function (): void {
      const inputFolder: string = './testInputs/example1';
      const outputFile: string = './lib/example1-output.api.ts';
      const expectedFile: string = path.join(inputFolder, 'example1-output.api.ts');

      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        rootDir: inputFolder,
        typeRoots: ['./'] // We need to ignore @types in these tests
      };
      const extractor: Extractor = new Extractor({
        compilerOptions: compilerOptions,
        errorHandler: testErrorHandler
      });

      extractor.analyze({
        entryPointFile: path.join(inputFolder, 'index.ts')
      });

      const apiFileGenerator: ApiFileGenerator = new ApiFileGenerator();
      apiFileGenerator.writeApiFile(outputFile, extractor);

      assertFileMatchesExpected(outputFile, expectedFile);

      /**
       * Errors can be found in testInputs/folder/MyClass
       */
      assert.equal(capturedErrors.length, 2);
      assert.equal(capturedErrors[0].message, 'Unknown JSDoc tag "@badjsdoctag"');
      assert.equal(capturedErrors[1].message, 'Unexpected text in JSDoc comment: '
        + '"(Error #1 is the bad tag) Text can no..."');
    });

    it('Example 2', function (): void {
      const inputFolder: string = './testInputs/example2';
      const outputFile: string = './lib/example2-output.api.ts';
      const expectedFile: string = path.join(inputFolder, 'example2-output.api.ts');

      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        rootDir: inputFolder,
        typeRoots: ['./'] // We need to ignore @types in these tests
      };
      const extractor: Extractor = new Extractor({
        compilerOptions: compilerOptions,
        errorHandler: testErrorHandler
      });

      extractor.analyze({
        entryPointFile: path.join(inputFolder, 'src/index.ts')
      });

      const apiFileGenerator: ApiFileGenerator = new ApiFileGenerator();
      apiFileGenerator.writeApiFile(outputFile, extractor);

      assertFileMatchesExpected(outputFile, expectedFile);
    });

    it('Example 4', function (): void {
      capturedErrors = [];

      const inputFolder: string = './testInputs/example4';
      const outputFile: string = './lib/example4-output.api.ts';
      const expectedFile: string = path.join(inputFolder, 'example4-output.api.ts');

      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        rootDir: inputFolder,
        typeRoots: ['./'] // We need to ignore @types in these tests
      };
      const extractor: Extractor = new Extractor({
        compilerOptions: compilerOptions,
        errorHandler: testErrorHandler
      });

      extractor.analyze({
        entryPointFile: path.join(inputFolder, 'src/index.ts')
      });

      const apiFileGenerator: ApiFileGenerator = new ApiFileGenerator();
      apiFileGenerator.writeApiFile(outputFile, extractor);

      assertFileMatchesExpected(outputFile, expectedFile);
      assert.equal(capturedErrors.length, 0);
    });
  });
});
