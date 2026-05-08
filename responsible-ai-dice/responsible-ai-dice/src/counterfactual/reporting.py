from __future__ import annotations

from datetime import datetime
from html import escape
from typing import Any, Dict, Iterable, List


class DiceReportBuilder:
    @staticmethod
    def _render_rows(rows: Iterable[tuple[str, Any]]) -> str:
        rendered_rows = []
        for key, value in rows:
            rendered_rows.append(
                f'<tr><th>{escape(str(key))}</th><td>{escape(str(value))}</td></tr>'
            )
        return ''.join(rendered_rows)

    @staticmethod
    def _render_changes(changes: List[Dict[str, Any]]) -> str:
        if not changes:
            return '<p class="muted">No feature changes were returned.</p>'

        rows = []
        for change in changes:
            rows.append(
                '<tr>'
                f'<td>{escape(str(change["featureName"]))}</td>'
                f'<td>{escape(str(change["originalValue"]))}</td>'
                f'<td>{escape(str(change["counterfactualValue"]))}</td>'
                f'<td>{escape(str(change.get("absoluteChange", "-")))}</td>'
                '</tr>'
            )
        return (
            '<table class="detail-table">'
            '<thead><tr><th>Feature</th><th>Original</th><th>Counterfactual</th><th>Absolute Change</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table>'
        )

    @staticmethod
    def build_html(result: Dict[str, Any]) -> str:
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        original_rows = DiceReportBuilder._render_rows(result['originalInstance'].items())

        counterfactual_sections: List[str] = []
        for example in result['counterfactuals']:
            counterfactual_rows = DiceReportBuilder._render_rows(example['data'].items())
            counterfactual_sections.append(
                '<section class="counterfactual-card">'
                f'<h3>Counterfactual {example["counterfactualIndex"]}</h3>'
                f'<p><strong>Predicted class:</strong> {escape(str(example["predictedClass"]))}</p>'
                f'<p><strong>Changed features:</strong> {example["changedFeatureCount"]}</p>'
                f'<p><strong>L1 distance:</strong> {example["distanceL1"]}</p>'
                f'<p>{escape(example["interpretation"])}</p>'
                '<h4>Counterfactual values</h4>'
                f'<table class="detail-table"><tbody>{counterfactual_rows}</tbody></table>'
                '<h4>Feature changes</h4>'
                f'{DiceReportBuilder._render_changes(example["changedFeatures"])}'
                '</section>'
            )

        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>DiCE Counterfactual Report</title>
  <style>
    body {{
      font-family: Arial, sans-serif;
      color: #1f2937;
      margin: 24px;
      line-height: 1.55;
    }}
    h1 {{
      background: #305669;
      color: #fff;
      padding: 16px 18px;
      border-radius: 12px;
      margin-bottom: 18px;
    }}
    h2, h3, h4 {{
      color: #305669;
      margin-bottom: 10px;
    }}
    .meta-grid {{
      display: grid;
      grid-template-columns: repeat(2, minmax(220px, 1fr));
      gap: 14px;
      margin-bottom: 22px;
    }}
    .meta-card, .counterfactual-card {{
      border: 1px solid #d7e0e5;
      border-radius: 12px;
      padding: 14px 16px;
      background: #f8fbfc;
      page-break-inside: avoid;
      margin-bottom: 18px;
    }}
    .detail-table {{
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px;
    }}
    .detail-table th, .detail-table td {{
      border: 1px solid #cfd8de;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }}
    .detail-table th {{
      background: #eef4f7;
      width: 28%;
    }}
    .summary {{
      background: #fff8ec;
      border-color: #edd7a4;
    }}
    .muted {{
      color: #6b7280;
    }}
  </style>
</head>
<body>
  <h1>DiCE Counterfactual Explainability Report</h1>
  <p><strong>Generated:</strong> {escape(timestamp)}</p>
  <div class="meta-grid">
    <section class="meta-card">
      <h2>Model</h2>
      <table class="detail-table"><tbody>
        {DiceReportBuilder._render_rows([
          ('Model name', result['modelName']),
          ('Model type', result['modelType']),
          ('Dataset name', result['datasetName']),
          ('Target column', result['targetColumn']),
        ])}
      </tbody></table>
    </section>
    <section class="meta-card summary">
      <h2>Run Summary</h2>
      <table class="detail-table"><tbody>
        {DiceReportBuilder._render_rows([
          ('Input index', result['inputIndex']),
          ('Original prediction', result['predictedClass']),
          ('Desired prediction', result['desiredClass']),
          ('Counterfactual count', result['summary']['counterfactualCount']),
          ('Average changed features', result['summary']['averageChangedFeatures']),
          ('Average L1 distance', result['summary']['averageDistanceL1']),
        ])}
      </tbody></table>
    </section>
  </div>

  <section class="meta-card">
    <h2>Selected Instance</h2>
    <table class="detail-table"><tbody>{original_rows}</tbody></table>
  </section>

  <section class="meta-card">
    <h2>Interpretation</h2>
    <p>
      The counterfactual examples below show the smallest practical feature changes that move the
      prediction from <strong>{escape(str(result['predictedClass']))}</strong> toward
      <strong>{escape(str(result['desiredClass']))}</strong>.
    </p>
  </section>

  {"".join(counterfactual_sections)}
</body>
</html>
"""
