"""Read stats from ycsb and output json for the graph"""
import argparse
import json
import os
from collections import defaultdict

def create_json_stats(args):
    d = {
        'title':args.title,
        'stats': [],
    }
    # Keep track of how many operations we do per product label:
    label_op_num = defaultdict(int)

    for path, operation, label in args.files:
        label_op_num[label] += 1
        stats = {
            "intervals": [],
            "label": label,
            "test": "{op_x}_{operation}".format(op_x=label_op_num[label],  operation=operation)
        }
        f = open(path)
        for line in f:
            if line.startswith("[{operation}],".format(operation=operation.upper())):
                line = line.strip()
                try:
                    oper, ms, latency, ops_per_sec = line.split(", ")
                except ValueError:
                    continue
                # Delete any trailing info after ops_per_sec:
                ops_per_sec = ops_per_sec.split(" ")[0]
                stats['intervals'].append([(int(ms) / 1000), (float(latency) / 1000), float(ops_per_sec)])
        d['stats'].append(stats)
    with open(args.json_file, "w") as f:
        f.write(json.dumps(d, sort_keys=True, indent=4, separators=(', ', ': ')))

                               

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='ycsb_stats')
    parser.add_argument('-j', '--json-file', required=True, help='JSON file to write to', dest='json_file', metavar='FILE')
    parser.add_argument('-t', '--title', required=True, help='Chart title', dest='title', metavar='TITLE')
    parser.add_argument('-f', '--file', required=True, nargs=3, help='YCSB data files to load along with it\'s description. Can be specified multiple times.', dest='files', metavar=('FILE','OPERATION','LABEL'), action='append')
    args = parser.parse_args()

    create_json_stats(args)
