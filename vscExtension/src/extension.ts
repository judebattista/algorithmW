import * as vscode from 'vscode';
import { iterateCode } from './checkTypes';

// called when extension activated
export function activate(context: vscode.ExtensionContext) {

	// register trigger for calling algorithm w 
	let disposable = vscode.commands.registerCommand('w-extension.checkTypes', () => {
		iterateCode(); 
	});

	context.subscriptions.push(disposable);
}

// called when extension deactivated
export function deactivate() {}
