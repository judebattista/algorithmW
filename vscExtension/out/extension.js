"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const checkTypes_1 = require("./checkTypes");
// called when extension activated
function activate(context) {
    // register trigger for calling algorithm w 
    let disposable = vscode.commands.registerCommand('w-extension.checkTypes', () => {
        checkTypes_1.iterateCode();
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// called when extension deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map