#!/bin/bash
# usage: api.sh <sess> <METHOD> <path> [json]
S=$1; M=$2; P=$3; D=$4
curl -s -w '\n[%{http_code}]\n' -X $M -H "Cookie: ankanu_session=01990000-0000-7000-8000-00000000$S" -H 'Content-Type: application/json' ${D:+-d "$D"} "http://localhost:4012$P"
