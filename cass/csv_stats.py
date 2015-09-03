"""A tool to generate cstar_perf graph data file from any csv file
containing timeseries metrics. 

There are some constraints on the form that this data takes:

  * As per the csv spec, the first line of the file should contain the
    names of the columns in the rest of the file.

  * The data must have a column that contains a time value in seconds.
    This may either be an elapsed time, or a unix timestamp. Either
    value must be a numeric representation. This value needs to be
    either the first value on each line, or needs to be called 'time'
    in the column listing. Alternatively, you may specify the name of
    this column with the --time-column argument.

  * All other fields need to be numeric (integer/float)
"""

import argparse
import csv
import json
import os
import re
from collections import defaultdict

def create_json_stats(args):
    d = {
        'title':args.title,
        'metrics': [],
        'stats': [],
        'time_column': 'elapsed_time'
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


        with open(path, 'rb') as csvfile:
            log = csv.reader(csvfile)

            # Pull out the metric names as the first line of the csv:
            metrics = log.next()
            if len(d['metrics']) > 0 and metrics != d['metrics']:
                raise AssertionError('metrics from first line of {path} are not consistent with previous files parsed: {metrics} is not same as before: {prior_metrics}'.format(path=path, metrics=metrics, prior_metrics=d['metrics']))
            d['metrics'] = metrics

            def floatize(x):
                try:
                    return float(x)
                except (TypeError, ValueError):
                    return 0

            # Determine which column holds the time value. This can be
            # explicit via the --time-column argument, or we can guess
            # based on 'time' being in the title. If all guesses,
            # fail, we'll use the first column.
            if args.time_column != None:
                time_column = metrics.index(args.time_column)
            else:
                for col in metrics:
                    if col.lower().startswith("time"):
                        time_column = metrics.index(col)
                        break
                else:
                    time_column = 0
            d['time_column'] = metrics[time_column]
                
            # Read the first line with data:
            data_line = log.next()
            # Use the first time value as the start point for all the
            # rest. This way, if the first value is 0, it represents
            # an elapsed time value, and all other time values will be
            # transferred untouched. Otherwise, all time values will
            # be subtracted from this initial value so that absolute
            # time stamps will get translated into elapsed times
            time_shift = floatize(data_line[time_column])

            def append_stat(line):
                # Shift time towards the beginning of the test:
                line[time_column] = floatize(line[time_column]) - time_shift
                stats['intervals'].append([floatize(x) for x in line])

            # Append the first data line, already read:
            append_stat(data_line)
            # Append the rest of the lines from the csv:
            for line in log:
                append_stat(line)
        
        d['stats'].append(stats)

    with open(args.json_file, "w") as f:
        f.write(json.dumps(d, sort_keys=True, indent=4, separators=(', ', ': ')))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='cass_stats')
    parser.add_argument('-j', '--json-file', required=True, help='JSON file to write to', dest='json_file', metavar='FILE')
    parser.add_argument('-t', '--title', required=True, help='Chart title', dest='title', metavar='TITLE')
    parser.add_argument('--time-column', help='The name of the column with the time, if unspecified it will make a guess')
    parser.add_argument('--subtitle', required=False, help='Chart subtitle', dest='subtitle', metavar='SUBTITLE', default=False)
    parser.add_argument('-f', '--file', required=True, nargs=3, help='stress output logs to load along with it\'s description. Can be specified multiple times.', dest='files', metavar=('FILE','OPERATION','LABEL'), action='append')
    args = parser.parse_args()

    create_json_stats(args)
