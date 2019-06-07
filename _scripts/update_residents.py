import csv
import os
import string
import random
import argparse
import requests
import multiprocessing
from urllib.parse import (urlparse, parse_qs)


parser = argparse.ArgumentParser(
    description='Update residents listing',
    formatter_class=argparse.ArgumentDefaultsHelpFormatter
)
parser.add_argument('--csv-file', type=argparse.FileType('r'), required=True,
                    help='Location of CSV file')
parser.add_argument('--template-file', type=argparse.FileType('r'),
                    required=True,
                    help='Location of template')
parser.add_argument('--image-location', type=str, required=True,
                    default='./assets/img/tenants/',
                    help='Location of template')
parser.add_argument('--residents-location', type=str, required=True,
                    default='./_residents/',
                    help='Location of template')


def load_csv(fd):
    reader = csv.DictReader(fd)
    return list(reader)


def _filename(data, base, ext, create_dir=True):
    name = data['Name'].translate(str.maketrans('', '', string.punctuation))
    outfile = os.path.join(base, data['Type'], f'{name}.{ext}')
    outfile = outfile.replace(' ', '_').lower()
    os.makedirs(os.path.dirname(outfile), exist_ok=True)
    return outfile


def get_image(data, img_dir):
    try:
        query = urlparse(data['Logo']).query
        fileid = parse_qs(query).get('id')[0]
    except (KeyError, IndexError, TypeError):
        return '/assets/img/tennant_placeholder.jpg'
    url = f"https://drive.google.com/uc?export=download&id={fileid}"
    r = requests.get(url, allow_redirects=True)
    fname = "".join(random.sample(string.ascii_letters, 12))
    open(fname, 'wb').write(r.content)
    outfile = _filename(data, img_dir, 'jpg')
    os.system(f'convert {fname} -flatten -quality 70 -resize 600x400 -gravity center -background white -extent 600x400 "{outfile}"')
    os.unlink(fname)
    return outfile


def create_resident_file(args):
    (data, template, file_dir, img_dir) = args
    print(f"Working on: {data['Name']}")
    data['Type'] = data['Type'].lower()
    data['image'] = get_image(data, img_dir)
    if data['Website'] and not data['Website'].startswith('http'):
        data['Website'] = f'http://{data["Website"]}'
    filename = _filename(data, file_dir, 'md')
    print(f"Creating: {filename}")
    with open(filename, 'w+') as fd:
        fd.write(template.format(**data))


if __name__ == "__main__":
    args = parser.parse_args()
    data = load_csv(args.csv_file)
    template = args.template_file.read()
    pool = multiprocessing.Pool(4)
    args = [(d, template, args.residents_location, args.image_location)
            for d in data]
    pool.map(create_resident_file, args)
