program
  = _ stmts:stmtlist _ { return {type: "Program", body: stmts, loc: location()}; }

block
  = _ "{" _ body:stmtlist _ "}" _ { return {type: "Block", body: body, loc: location()}; }

stmtlist
  = stmts:stmt|..,""| { return [...stmts]; }

stmt
  = _ s:(declaration/assignment) _ ";" _ { return s; }
  / block
  / _ i:if _ { return i; }


declaration
  = type:("bool"/"int"/"float") __ name:identifier _ "=" _ init:expression { return {type: "Declaration", name: name, typename: type, init: init, loc: location()};}
  / type:("bool"/"int"/"float") __ name:identifier { return {type: "Declaration", name: name, typename: type, init: null, loc: location()}; }

assignment
  = target:access _ op:("="/"+="/"-="/"*="/"/=") _ val:expression { return { type: "Assignment", target: target, op:op, value: val, loc: location()};}

if
  = "if" __ test:expression _ consequent:stmt _ alternate:else? { return {type: "Conditional", test:test, consequent:consequent, alternate:alternate, loc: location()};}

else
  = "else" _ stmt:stmt { return stmt; }

expression
  = _ expr:ternary _ { return expr;}

ternary
  = test:logicor _ "?" _ consequent:logicor _ ":" _ alternate:logicor { return {type: "Ternary", test:test, consequent:consequent, alternate:alternate, loc: location()}; }
  / logicor

logicor
  = left:logicand _ "||" _ right:logicor { return {type: "Binary", op:"||", left:left, right:right, loc: location()}; }
  / logicand

logicand
  = left:relational _ "&&" _ right:logicand { return {type: "Binary", op: "&&", left:left,right:right, loc: location()};}
  / relational

relational
  = left:additive _ op:("=="/"!="/"<"/"<="/">"/">=") _ right:relational { return {type: "Binary", op:op, left: left, right: right, loc: location() };}
  / additive

additive
  = left:multiplicative _ op:("+"/"-") _ right:additive { return {type: "Binary", op:op, left:left, right:right, loc: location()}; }
  / multiplicative

multiplicative
  = left:primary _ op:("*"/"/"/"%") _ right:multiplicative { return {type: "Binary", op:op, left:left, right:right, loc: location()}; }
  / primary

primary // TODO: unary
  = "(" _ expr:expression _ ")" { return expr; }
  / cast
  / literal
  / access


cast
  = op:("int"/"float"/"bool") _ "(" _ expr:expression _ ")" { return {type: "Cast", op: op, expr: expr}; }

literal
  = booleanliteral
  / floatliteral
  / intliteral


booleanliteral
  = "true" { return {type: "BooleanLiteral", value: true, loc: location()}; }
  / "false" { return {type: "BooleanLiteral", value: false, loc: location()}; }

floatliteral
  = "." digits:[0-9]+ { return {type: "FloatLiteral", value: parseFloat(`0.${digits.join("")}`), loc: location()}; }
  / pre:[0-9]+ "." post:[0-9]* { return {type: "FloatLiteral",value: parseFloat(`${pre.join("")}.${post.join("")}`), loc: location()}; }

intliteral
  = digits:[0-9]+ { return {type: "IntLiteral", value: parseInt(digits.join("")), loc: location()}; }

access
  = path:access_ { return { type: "Access", path: path, loc: location()};}

access_
  = identifier|..,"."|

identifier
  = head:[a-zA-Z] tail:[a-zA-Z0-9_]* { return `${head}${tail.join("")}`;}




_ = [ \t\r\n]*
__ = [ \t\r\n]+