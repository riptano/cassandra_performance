# Cassandra Benchmarks

Cassandra Benchmarks Map: https://docs.google.com/spreadsheets/d/1UHfVVq9ExpqRNq6lKJXsX73VbsmaV6DT3gytQ90H0AA

## Repository Structure

    |- Section
       |- TestName
          |- README.md
          |- profile.yaml
          |- test.json
          |- results
             |- YYYY-MM-DD


Example:

    |- mv
       |- README.md
       |- basic_0_1_5
          |- users.yaml
          |- test.json
          |- results
             |- 2015-05-06
                |- test.log
    |- compaction
       |- README.md
          |- simple_sizedtiered
             |- users.yaml
             |- test.json
             |- results
                |- 2015-04-05
