#!/bin/bash

python ../cass_stats.py -j ../../graph_v5/data/twcs_dtcs.read.json -t "TWCS vs DTCS (read)" --subtitle "" -f dtcs-read.txt READ "dtcs" -f twcs-read.txt READ "twcs" -f 9644-read.txt READ "dtcs-9644"
