#!/bin/bash

python ../../csv_stats.py -j ../../../graph_v5/data/mvbench.aboudreault.08-2015.json -t "mvbench 4 MVs vs 4 manual denormalizations" --subtitle "" \
       -f manual/add.csv add "Manual Dernormalization" -f view/add.csv add "Materialized Views" \
       -f manual/delete.csv delete "Manual Dernormalization" -f view/delete.csv delete "Materialized Views" \
       -f manual/error.csv error "Manual Dernormalization" -f view/error.csv error "Materialized Views" \
       -f manual/read.csv read "Manual Dernormalization" -f view/read.csv read "Materialized Views" \
       -f manual/total.csv total "Manual Dernormalization" -f view/total.csv total "Materialized Views" \
       -f manual/update.csv update "Manual Dernormalization" -f view/update.csv update "Materialized Views"
       
