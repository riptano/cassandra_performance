#!/bin/bash

python ../cass_stats.py -j ../../graph_v5/data/twcs_dtcs.brief.json -t "TWCS vs DTCS (brief)" --subtitle "" -f dtcs-brief.txt MIXED "dtcs" -f twcs-brief.txt MIXED "twcs" -f twcs-stress.txt INSERT "twcs" -f dtcs-stress.txt INSERT "dtcs"
