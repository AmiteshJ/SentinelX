import pytest
from app.hunting.parser import parse_thql, ParseError

def test_parse_simple_equals():
    query = 'source_ip = "10.0.0.1"'
    result = parse_thql(query)
    assert result == {"source_ip": "10.0.0.1"}

def test_parse_and_condition():
    query = 'source_ip = "10.0.0.1" AND destination_port = 4444'
    result = parse_thql(query)
    assert result == {"$and": [{"source_ip": "10.0.0.1"}, {"destination_port": 4444}]}

def test_parse_or_condition():
    query = 'source_ip = "10.0.0.1" OR source_ip = "10.0.0.2"'
    result = parse_thql(query)
    assert result == {"$or": [{"source_ip": "10.0.0.1"}, {"source_ip": "10.0.0.2"}]}

def test_parse_in():
    query = 'destination_port IN (4444, 5555, 80)'
    result = parse_thql(query)
    assert result == {"destination_port": {"$in": [4444, 5555, 80]}}

def test_parse_not():
    query = 'NOT destination_port = 80'
    result = parse_thql(query)
    assert result == {"$nor": [{"destination_port": 80}]}

def test_parse_contains():
    query = 'hostname CONTAINS "admin"'
    result = parse_thql(query)
    assert result == {"hostname": {"$regex": "admin", "$options": "i"}}

def test_parse_starts_with():
    query = 'process_name STARTS_WITH "cmd"'
    result = parse_thql(query)
    assert result == {"process_name": {"$regex": "^cmd", "$options": "i"}}

def test_parse_between():
    query = 'destination_port BETWEEN 1000 AND 2000'
    result = parse_thql(query)
    assert result == {"destination_port": {"$gte": 1000.0, "$lte": 2000.0}}

def test_parse_complex():
    query = '(source_ip = "10.0.0.15" OR source_ip = "10.0.0.16") AND destination_port IN (4444, 5555) AND NOT protocol = "UDP"'
    result = parse_thql(query)
    
    # Outer is two ANDs -> nested $and
    assert "$and" in result
    assert len(result["$and"]) == 2
    
def test_invalid_field():
    query = 'invalid_field = "test"'
    with pytest.raises(ParseError):
        parse_thql(query)

def test_sql_injection_attempt():
    query = 'source_ip = "1; DROP TABLE users"'
    result = parse_thql(query)
    # the whole string is just a string literal in THQL!
    assert result == {"source_ip": "1; DROP TABLE users"}
