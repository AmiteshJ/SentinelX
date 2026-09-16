import re
from typing import Any

# Allowed fields to prevent NoSQL injection / querying unauthorized fields
ALLOWED_FIELDS = {
    "source_ip", "destination_ip", "source_port", "destination_port", 
    "protocol", "hostname", "username", "process_name", "domain", 
    "url", "event_type", "action", "severity", "timestamp"
}

class ParseError(Exception):
    pass

def tokenize(query: str):
    token_spec = [
        ("AND", r"\bAND\b|\band\b"),
        ("OR", r"\bOR\b|\bor\b"),
        ("NOT", r"\bNOT\b|\bnot\b"),
        ("IN", r"\bIN\b|\bin\b"),
        ("BETWEEN", r"\bBETWEEN\b|\bbetween\b"),
        ("CONTAINS", r"\bCONTAINS\b|\bcontains\b"),
        ("STARTS_WITH", r"\bSTARTS_WITH\b|\bstarts_with\b"),
        ("OP", r"<=|>=|!=|=|<|>"),
        ("LPAREN", r"\("),
        ("RPAREN", r"\)"),
        ("COMMA", r","),
        ("STRING", r"\"[^\"]*\"|'[^']*'"),
        ("NUMBER", r"-?\d+(\.\d+)?"),
        ("IDENT", r"[a-zA-Z_][a-zA-Z0-9_]*"),
        ("WS", r"\s+"),
        ("MISMATCH", r"."),
    ]
    tok_regex = "|".join("(?P<%s>%s)" % pair for pair in token_spec)
    for mo in re.finditer(tok_regex, query):
        kind = mo.lastgroup
        value = mo.group()
        if kind == "WS":
            continue
        elif kind == "MISMATCH":
            raise ParseError(f"Unexpected character: {value}")
        yield kind, value

class Parser:
    def __init__(self, tokens):
        self.tokens = list(tokens)
        self.pos = 0

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None, None

    def consume(self, expected_kind=None):
        kind, value = self.peek()
        if expected_kind and kind != expected_kind:
            raise ParseError(f"Expected {expected_kind}, got {kind}")
        self.pos += 1
        return kind, value

    def parse(self):
        if not self.tokens:
            return {}
        expr = self.parse_or()
        if self.pos < len(self.tokens):
            raise ParseError("Unexpected tokens at end of query")
        return expr

    def parse_or(self):
        left = self.parse_and()
        while self.peek()[0] == "OR":
            self.consume("OR")
            right = self.parse_and()
            left = {"$or": [left, right]}
        return left

    def parse_and(self):
        left = self.parse_not()
        while self.peek()[0] == "AND":
            self.consume("AND")
            right = self.parse_not()
            left = {"$and": [left, right]}
        return left

    def parse_not(self):
        if self.peek()[0] == "NOT":
            self.consume("NOT")
            expr = self.parse_not()
            # Wrap in $nor to negate
            return {"$nor": [expr]}
        return self.parse_primary()

    def parse_primary(self):
        kind, value = self.peek()
        if kind == "LPAREN":
            self.consume("LPAREN")
            expr = self.parse_or()
            self.consume("RPAREN")
            return expr
        
        # It must be an identifier (field)
        if kind != "IDENT":
            raise ParseError(f"Expected field identifier, got {value}")
        
        _, field = self.consume("IDENT")
        if field not in ALLOWED_FIELDS:
            raise ParseError(f"Field '{field}' is not allowed for hunting")

        # Operator
        op_kind, op_val = self.consume()
        
        if op_kind == "OP":
            val = self.parse_value()
            if op_val == "=":
                return {field: val}
            elif op_val == "!=":
                return {field: {"$ne": val}}
            elif op_val == ">":
                return {field: {"$gt": val}}
            elif op_val == ">=":
                return {field: {"$gte": val}}
            elif op_val == "<":
                return {field: {"$lt": val}}
            elif op_val == "<=":
                return {field: {"$lte": val}}
        
        elif op_kind == "IN":
            self.consume("LPAREN")
            values = []
            values.append(self.parse_value())
            while self.peek()[0] == "COMMA":
                self.consume("COMMA")
                values.append(self.parse_value())
            self.consume("RPAREN")
            return {field: {"$in": values}}
            
        elif op_kind == "CONTAINS":
            val = self.parse_value()
            if not isinstance(val, str):
                raise ParseError("CONTAINS requires a string value")
            # Case insensitive regex match for contains
            return {field: {"$regex": re.escape(val), "$options": "i"}}
            
        elif op_kind == "STARTS_WITH":
            val = self.parse_value()
            if not isinstance(val, str):
                raise ParseError("STARTS_WITH requires a string value")
            return {field: {"$regex": "^" + re.escape(val), "$options": "i"}}
            
        elif op_kind == "BETWEEN":
            val1 = self.parse_value()
            self.consume("AND")
            val2 = self.parse_value()
            return {field: {"$gte": val1, "$lte": val2}}
            
        else:
            raise ParseError(f"Unexpected operator: {op_val}")

    def parse_value(self):
        kind, value = self.consume()
        if kind == "STRING":
            return value[1:-1] # strip quotes
        elif kind == "NUMBER":
            return float(value) if "." in value else int(value)
        else:
            raise ParseError(f"Expected string or number, got {value}")

def parse_thql(query_string: str) -> dict[str, Any]:
    """
    Parses a Threat Hunting Query Language (THQL) string and returns a safe 
    MongoDB Query Language (MQL) dictionary.
    """
    if not query_string or not query_string.strip():
        return {}
    tokens = tokenize(query_string)
    parser = Parser(tokens)
    return parser.parse()
