from flask import Flask, jsonify, render_template


def run_app():
    app = Flask(__name__, template_folder="ui/templates", static_folder="ui/static")
