"""Read stats from stress and output json for the graph"""
import argparse
import json
import os
import re
from collections import defaultdict

def create_json_stats(args):
    d = {
        'title':args.title,
        'stats': [],
    }
    if args.subtitle is not False:
        d['subtitle'] = args.subtitle

    # Keep track of how many operations we do per product label:
    label_op_num = defaultdict(int)

    for path, operation, label in args.files:
        label_op_num[label] += 1
        stats = {
            "intervals": [],
            "label": label,
            "test": "{op_x}_{operation}".format(op_x=label_op_num[label],  operation=operation)
        }

        log = open(path)
        collecting_aggregates = False
        collecting_values = False

        # Regex that matches trunk stress output:
        start_of_intervals_re = re.compile('type,.*total ops,.*op/s,.*pk/s')

        for line in log:
            if line.startswith("Results:"):
                collecting_aggregates = True
                continue
            if not collecting_aggregates:
                if start_of_intervals_re.match(line):
                    collecting_values = True
                    continue
                if collecting_values:
                    line_parts = [l.strip() for l in line.split(',')]
                    # Only capture total metrics for now
                    if line_parts[0] == 'total':
                        try:
                            stats['intervals'].append([float(x) for x in line_parts[1:]])
                        except:
                            pass
                    continue
                continue
            if line.startswith("END") or line == "":
                continue
            # Collect aggregates:
            stat, value  = line.split(":", 1)
            stats[stat.strip()] = value.strip()
        log.close()
        d['stats'].append(stats)
    with open(args.json_file, "w") as f:
        f.write(json.dumps(d, sort_keys=True, indent=4, separators=(', ', ': ')))

                               

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='cass_stats')
    parser.add_argument('-j', '--json-file', required=True, help='JSON file to write to', dest='json_file', metavar='FILE')
    parser.add_argument('-t', '--title', required=True, help='Chart title', dest='title', metavar='TITLE')
    parser.add_argument('--subtitle', required=False, help='Chart subtitle', dest='subtitle', metavar='SUBTITLE', default=False)
    parser.add_argument('-f', '--file', required=True, nargs=3, help='stress output logs to load along with it\'s description. Can be specified multiple times.', dest='files', metavar=('FILE','OPERATION','LABEL'), action='append')
    args = parser.parse_args()

    create_json_stats(args)
