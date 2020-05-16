import * as vscode from 'vscode';
import * as esprima from 'esprima'; 
import { ADDRGETNETWORKPARAMS } from 'dns';
import { AlgorithmW } from './algorithmW';
import { FunctionDefinition } from './algorithmW';
import { FunctionCall } from './algorithmW';
import { Identifier } from './algorithmW';
// iterates over the inputted code and parses it out into the format we want 
// current implementation is a proof of concept, not a general case 
export const iterateCode = () => {
    const doc = vscode.window.activeTextEditor?.document; 
    if (doc !== undefined) { 
        // input validation for file type 
        if (doc.fileName.substring(doc.fileName.length-3) === ".js") {
            // parses the document into a tree 
            let parsed = esprima.parseScript(doc.getText()); 
            let resultList:string[][] = []; 
            // iterates over the body recursively using parse object 
            parsed.body.forEach((entry) => {
                resultList.push(parseObject(entry));
            });
            // concatenates all the results found into a string 
            let code = getParseString(resultList); 
            console.log(code);
            debugger;
            // eval("var f = " + code + ";");
            eval("5+5");
            // eval(code);
            let string =`import { AlgorithmW } from './algorithmW';import { FunctionDefinition } from './algorithmW';import { FunctionCall } from './algorithmW';import { Identifier } from './algorithmW';`
            code = "var f = " + code + ";";
            var f;
            eval(string + code);
            var x = AlgorithmW(f, {}, []);
            console.log(x.toString());
        } else { 
            vscode.window.showWarningMessage("Check Types only works for Javascript. Other languages will not have accurate checking.");
        }
    }
};

// @param entry: the object to parse 
// @param result: the list of recognized tokens
const parseObject = (entry:Object) => {
    let tokens:string[] = [];           // the tokens we want 
    let keys = Object.keys(entry);      // the property names of the object being discovered
    let values = Object.values(entry);  // the property values of the object 
    let iterator:number = 0; 
    keys.forEach((key) => {
        switch(key) {
            case "type":
                if (values[iterator] === "FunctionDeclaration") {
                    tokens.push("new FunctionDefinition('");
                } else if (values[iterator] === "ReturnStatement") {
                    tokens.push("[new Identifier('");
                }
                break; 
            case "id":
                if (tokens[tokens.length-1] === "new FunctionDefinition('") tokens.push(values[iterator].name + "',");
                break; 
            case "body":
                let bodySeg = values[iterator].body;
                for (let i = 0; i < bodySeg.length; i++) {
                    tokens = tokens.concat(parseObject(bodySeg[i]));
                }
                break; 
            case "argument":
                tokens.push(values[iterator].value + "')])");
                break; 
        }


        // general cases for parsing js 

        // switch (key) {
        //     case "type": 
        //         if (values[iterator] === "FunctionDeclaration") {
        //             tokens.push("fn");
        //         } else if (values[iterator] === "CallExpression") {
        //             tokens.push("call");
        //         }
        //         break; 
        //     case "id":
        //         if (tokens[tokens.length-1] === "fn") tokens.push(values[iterator].name);
        //         break; 
        //     case "params": 
        //         let params = values[iterator]; 
        //         let paramInfo:string[] = [];
        //         for (let i = 0; i < params.length; i++) {
        //             if (params[i].name !== "func") {
        //                 paramInfo.push(params[i].name);
        //             }
        //         }
        //         tokens = tokens.concat(paramInfo); 
        //         break; 
        //     case "body":
        //         let iterateOver:string[] = (values[iterator].length === undefined) ? [values[iterator]] : values[iterator];
        //         for (let i = 0; i < iterateOver.length; i++) {
        //             tokens = tokens.concat(parseObject(iterateOver[i]));
        //         }
        //     case "argument": 
        //         for (let i = 0; i < values[iterator].arguments.length; i++) {
        //             tokens = tokens.concat(parseObject(values[iterator].arguments[i]));
        //         }
        //     case "callee":
        //         tokens = tokens.concat(parseObject(values[iterator]));
        // }
        iterator++; 
    });
    return tokens; 
};

// returns a string representation of the parsed object 
const getParseString = (list:string[][]) => {
    let result:string = ""; 
    for (let i = 0; i < list.length; i++) {
        for (let j = 0; j < list[i].length; j++) {
            result += list[i][j];
        }
    }
    return result; 
};

