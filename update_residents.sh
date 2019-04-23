#!/bin/bash

curl "https://docs.google.com/spreadsheets/d/1xLvSbctkGbeyJ9wQmt-wWl6N5zQ_wvx7OizTK7k_dy8/gviz/tq?tqx=out:csv&sheet=Current" > residents.csv
python _scripts/update_residents.py --csv-file residents.csv --template-file ./_scripts/residents_template.md --image-location assets/img/tenants/ --residents-location _residents/
rm -rf residents.csv
