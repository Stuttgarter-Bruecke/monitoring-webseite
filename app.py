#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask import Flask
from flask import render_template
from flask_assets import Environment, Bundle
import sqlite3
import os
import io
import pandas as pd
import dateutil

class Object(object):
    """ This class does not do anything"""
    pass

app = Flask(__name__)

DATABASE = os.path.join(app.root_path, 'static/data/scanntronicDaten.sqlite'),

######################################################################
#  Compile scss files
######################################################################
assets = Environment(app)
assets.url = app.static_url_path
scss = Bundle('../assets/scss/nav_bar.scss', filters='pyscss', output='css/nav_bar.css')
assets.register('scss_all', scss)

# Sensoren
list_sensors = ['Riss Integraler Stoss',
                'Riss Mitte',
                'Hygro Integraler Stoss',
                'Hygro Mitte',
                ]

list_url = ['riss_integraler_stoss',
            'riss_mitte',
            'hygro_integraler_stoss',
            'hygro_mitte',
            ]

# SQL tables
list_sql_tables = ['RissFoxIntegralerStoss',
                   'RissFoxMitte',
                   'HygroFoxIntegralerStoss',
                   'HygroFoxMitte',
                   ]

sensors = []
# Make dictionary
sensors_dict = {}
sensors_props = {}

for url, name, sql in zip(list_url, list_sensors, list_sql_tables):
    aux_obj = Object()
    aux_obj.name = name
    aux_obj.url = url
    aux_obj.sql = sql
    sensors.append(aux_obj)
    #
    sensors_dict[url] = name
    #
    sensors_props[name] = [name, url, sql]

# Index
@app.route("/")
def index():
    return render_template("index.html", name='Monitoring des Stuttgarter Brücke', categories=sensors)

@app.route("/about")
def about():
    """about Seite
    :returns: TODO

    """
    return render_template("about.html", categories=sensors)

# Sensors
@app.route("/sensoren/<url>")
def sensoren(url=None):
    """about Seite
    :returns: TODO

    """
    name = sensors_dict[url]
    return render_template("sensor.html", name=name, categories=sensors,
            plot_data=sensors_props[name])

@app.route("/daten/<table>_<zoom>")
def export_json(table=None, zoom=None):
    """TODO: Docstring for export_json.

    :arg1: TODO
    :returns: TODO

    """
    # Connect to Database
    rv = sqlite3.connect(DATABASE[0])
    rv.row_factory = sqlite3.Row

    # Get the data from the database
    sqlString = "SELECT * FROM " + table
    # create data frame
    df_sql = pd.read_sql(sql=sqlString ,con=rv)
    #df_sql['index'] = df_sql['index'].apply(dateutil.parser.parse, dayfirst=False)
    col_1 = df_sql.columns[1]
    col_2 = df_sql.columns[2]
    col_3 = df_sql.columns[3]
    #df_sql = df_sql[['timestamp', col_1, col_2, col_3]][0:7000:int(zoom)]
    df_sql = df_sql[0:-1:int(zoom)]
    # export data with json format as buffer
    data_buff = df_sql.to_json(None, orient='records')

    return (data_buff)



if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
