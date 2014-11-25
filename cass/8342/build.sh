#!/bin/bash

python ../cass_stats.py -j ../../graph_v4/data/stats.8342.json -t "CASSANDRA-8342" --subtitle "1x i2.8xlarge 170M 5x32 rows - read w/ 500 threads" -f default.log READ "32" -f 64.log READ "64" -f 128.log READ "128" -f 256.log READ "256" -f 512.log READ "512"
