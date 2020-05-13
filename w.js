/*
    A Hindley-Milner implementation in the JavaScript, by the JavaScript, for the Javascript
    More accurately, a limited subset of JS, since holy crap, parsing that soup-sandwich masquerading as a language is a nightmare. 
    
    I relied heavily on Algorithm W Step by Step by Martin Grabmuller
        (http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.65.7733&rep=rep1&type=pdf)
    (while devoutly wishing I had done this in Haskell...)
    
    I also referenced Generalizing Hindley-Milner Type Inference Algorithms by Heeren, Hage, and Swierstra
        (https://researchgate.net/publication/2528716_Generalizing_Hindley-Milner_Type_Inference_Algorithms)

    Robert Smallshire's python implementation was the basis for translating the algorithm to an imperative model 
    (https://github.com/rob-smallshire/hindley-milner-python) 
            based on the Scala implementation by Andrew Forrest
                based on the Perl code by Nikita Borisov
                    based on the paper "Basic Polymorphic Type Checking" by Luca Cardelli 
                        (http://lucacardelli.name/Papers/BasicTypechecking.pdf)
    In retrospect this turned into more of an adaptation of Smallshire's work.
                    
    Written by Jude Battista for CS-370 (Programming Languages) at Whitworth University.
*/

/*
Grabmuller's abstract syntax:

data Exp = EVar String
    | ELit Lit
    | EApp Exp Exp
    | EAbs String Exp
    | ELet String Exp Exp
deriving (Eq, Ord)

data Lit = LInt Integer
    | LBool Bool
deriving (Eq, Ord)

data Type = TVar String
    | TInt
    | TBool
    | TFun Type Type
deriving (Eq, Ord)

data Scheme = Scheme [String ] Type

*/

// Note that if, for some reason, you're making this web-based, browsers that do not support ES6 will not handle classes.
// I suspect anyone viewing a webpage devoted to type inference is not using IE8, or IE :: Num a => String, though, 
// so you're probably good.

/* 
    Our AST node types:
    
        function definition (EAbs String Exp)

        function call (EApp Exp Exp)

        let (ELet String Exp Exp)

        identifier (EVar String)

        primitive types: Boolean, Number, String
*/

class FunctionDefinition {
    constructor(v, body) {
        this.v = v;
        this.body = body;
    }
}


class FunctionCall {
    constructor(fcn, args) {
        this.fcn = fcn;
        this.args = args;
    }
}


class Let {
    constructor(v, defn, body) {
        this.v = v;
        this.defn = defn;
        this.body = body;
    }
}

class Identifier {
    constructor(name) {
        this.name = name;
    }
}


/*
    Our JS Types

    Type - the parent for all the other types 

    Specific Types with which we shall concern ourselves:
    Variable: 
        var a 
        | const
        | let a
    
    Function:
        function x() {}
        | x = function() {}

    Boolean

    Number

    String
*/

// A TYPE VARIABLE, not a specific type
// Automatically assigned an ID, but not given a name until necessary
class Variable {
    // I think these initializations should happen just one time
    static next_variable_id = 0;
    static base_variable_name = 'a';

    constructor() {
        // Set the id for the instance of the variable
        this.id = Variable.next_variable_id;
        // Increment the value for the next instantiation.
        // Global state, wheeeee!
        Variable.next_variable_id++;
        // The variable is NOT connected to an instance of a type yet
        // Explicitly set it to null to avoid confusion with undefined
        self.instance = null;
        // variable has not been associated with an identifier yet.
        // Explicitly set it to null to avoid confusion with undefined.
        self.name = null;
    }

    name() {
        if (this.name === null) {
            // This is a clever bit of code from https://stackoverflow.com/questions/12504042/what-is-a-method-that-can-be-used-to-increment-letters
            // I do hope we don't have more than 26 variables though...
            // A possible solution is construct two character strings.
            return "'" + String.fromCharCode(base_variable_name.charCodeAt(0) + this.id);
        } 
    }

    toString() {
        if (this.instance === null)
        { 
            return this.name();
        } 
        return this.instance.toString();
    }
}

// The base for specific types
// We can test to see if something is a type variable or a specific type 
// by using instanceof Type
// Any Type has a name and a list of types it contains
class Type {
    // name: string
    // types: array of types
    constructor(name, types) {
        this.name = name;
        this.types = types;
    }

    toString() {
        const typeCount = types.length
        let typeString = '';
        // If we have types in the array, we want to convert each of them to a string 
        if (typeCount === 0)
        {
            return this.name
        }
        // Map toString over our types array, then join them with separating spaces
        const typeStrings = this.types.map(type => type.toString()).join(' ');
        // Join the resulting strings with a separating space.
        return this.name() + ' ' + typeStrings; 
    }
}

// Specific types
class Boolean extends Type {
    constructor() {
        super("Boolean", []);
    }
}

class Number extends Type {
    constructor() {
        super("Number", []);
    }
}

class String extends Type {
    constructor() {
        super("String", []);
    }
}

// I think this handles the case of a multi-parameter function thanks
// to how Type handles a list of types.
// Note that the LAST element of types is assumed to be the return type.
// Another possibility is to emulate Haskell and make each function take
// a single input type and a single output type.
// We can then chain these functions to achieve multiple input types
class Function extends Type {
    constructor(types) {
        super("Function", types);
    }
}

// Ok, here we go! Let's find some types
// AlgorithmW examines an expression represented by an AST and produces the type
// node: root of our AST
// gamma: the set of known mappings from identifiers to type assignments. Object, treat like dictionary
// nonGenerics: set of non-generic variables
function AlgorithmW(node, gamma, nonGenerics = []) {
    if (node instanceof Identifier) {
        return getType(node.name, gamma, nonGenerics);
    } 
    else if (node.instanceof(FunctionCall)) {
        let signatureTypes = [];
        // Get the type of the node's function
        const fcnType = AlgorithmW(node.fcn, gamma, nonGenerics);
        // Get the type of each of the arguments to the function
        node.args.forEach(arg => {
            signatureTypes.push(AlgorithmW(arg, gamma, nonGenerics));
        });
        // Stick a type variable at the end for the return type
        // Note the use of var here: unify will update fcnType
        var fcnType = new Variable();
        signatureTypes.push(fcnType);
        unify(new Function(signatureTypes), fcnType);
        return fcnType;
    }
    else if (node instanceof Function) {
        // Note that Smallshire uses copies of gamma and nonGenerics here
        // and I'm not sure why. Suspect scoping issues, which do not apply
        // if we're using var.
        // We're going to copy nonGeneric since I suspect it may have scoping issues.
        // If it breaks, reconsider
        let newNonG = nonGenerics.slice();
        // If we want to parse let and const, we may want to copy gamma too
        // let delta = {...gamma};
        let signatureTypes = [];

        // To handle multiple args we need to loop through the array
        // Smallshire only directly accounts for a -> b type functions.
        node.args.forEach(arg => {
            argType = new Variable();
            newNonG.push(argType);
            gamma[arg.v] = argType;
            signatureTypes.push(argType);
        });
        resultType = AlgorithmW(node.body, gamma /*delta*/, newNonG);
        signatureTypes.push(resultType);
        // Do we need to update gamma with this new Function?
        // resultFcn = new Function(signatureTypes);
        // gamma[node.v] = resultFcn;
        // return resultFcn;
        return new Function(signatureTypes);
    }
    else if (node instanceof Let) {
        let defnType = AlgorithmW(node.defn, gamma, nonGenerics);
        // Another place we may need to copy gamma
        // let delta = {...gamma};
        gamma[node.v] = defnType;
        return AlgorithmW(node.body, gamma /*delta*/, nonGenerics);
    }
    // If we have an actual type
    else if (node instanceof Type) {
        return convertNodeToPrimitiveType(node);
    }
}

// Makes a copy of a type expression
// Smallshire uses a secondary recursive function.
// I think we can just make fresh recursive by passing in mapping
// and instantiating mapping if it does not exist
function fresh(typeA, nonGenerics, mapping) {
    // Maps Variable to Variable
    if (mapping == null) {
        mapping = {};
    }
    prunedType = prune(typeA);
    // if A is a type Variable
    if (typeA instanceof Variable) {
        // and if A is a generic
        if (isGeneric(prunedType, nonGenerics)) {
            // And we have not yet mapped A
            // Should we be mapping prunedType or prunedType.id?
            // id makes more sense to me, but if it breaks, reconsider
            if (!mapping[prunedType.id]) {
                mapping[prunedType.id] = new Variable();
            }
            return mapping[prunedType.id]
        }
        // if A is not generic
        else {
            return prunedType;
        }
    }
    else if (prunedType instanceof Type) {
        return new Type(prunedType.name, prunedType.types.map( type => {
            fresh(type, nonGenerics, mapping);
        }));
    }
}

// typeA should be pruned prior to checking whether it is Generic
function isGeneric(typeA, nonGenerics) {
    return !inTypeArray(typeA, nonGenerics);
}

// Equivalent to Smallshire's occurs_in, but not nearly as nice
function occursInTypeArray(typeA,typeArray) {
    //check each type in array to see whether it contains typeA
    const hasTypeA = typeArray.map(typeB => {
        // Watch this for mutual recursion
        return occursInType(typeA, typeB);
    });
    return hasTypeA.include(typeA);
}

// Check to see if type variable v occurs in typeB
function occursInType(v, typeB) {
    prunedB = prune(typeB);
    if (v == prunedB) {
        return true;
    }
    else if (prunedB instanceof Type) {
        // Watch this for mutual recursion.
        return occursInTypeArray(v, prunedB.types)
    }
    return false;
}

function unify(typeA, typeB) {
    typeA = prune(typeA);
    typeB = prune(typeB);
    // Case 1:
    // if A is a type variable
    if(typeA instanceof Variable ) {
        // and A != B
        if (typeA != typeB) {
            // Avoid endless recursive unification
            if(occursInType(typeA, typeB)) {
                // Throw an exception here?
                return;
            }
            // Otherwise give typeA an instance of typeB
            typeA.instance = typeB;
        }
    }
    // Case 2:
    // Check to see if A is a type and  B is a type variable
    else if (typeA instanceof Type && typeB instanceof Variable) {
        // flip and fall back to Case 1
        unify(typeB, typeA);
    }
    // Case 3:
    // Both A and B are types
    else if (typeA instanceof Type && typeB instanceof Type) {
        // check for a type mismatch:
        if (typeA.name !== typeB.name || typeA.types.length !== typeB.types.length) {
            // Throw an exception here?
            return;
        }
        // Unify each of the types belonging to A and B
        // If we get this far, the type lists should have the same length
        // JS doesn't have a zipWith function
        // We could zip the two type lists together, but it's probably more efficient
        // to just iterate 
        for (let ndx = 0; ndx < typeB.types.length; ndx++) {
            unify(typeA.types[ndx], typeB.types[ndx]);
        }
    }
    else {
        // Failed to unify
        // throw exception?
        return;
    }
}

// Return the currently defining instance of typeA
// Also removes all the instantiated variables in the chain, hence the name
function prune(typeA) {
    if (typeA instanceof Variable && typeA.instance != null) {
        // recurse!
        typeA.instance = prune(typeA.instance);
        return typeA.instance;
    }
    return typeA;
}

// Not a huge fan of this name
function getType(name, gamma, nonGenerics) {
    // If the name exists in gamma, return the associated type
    if (gamma[name]) {
        return fresh(gamma[name], nonGenerics);
    }
    switch (type.name) {
        case 'Boolean':
            return new Boolean();
        case 'Number':
            return new Number();
        case 'String':
            return new String();
    }
}

