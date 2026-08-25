import os
from typing import Dict, Any, List, Optional
import matplotlib.pyplot as plt
import seaborn as sns
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

class ReportGenerator:
    """
    Renders risk visualization charts and compiles high-fidelity PDF climate
    risk reports with customized styling, tables, and integrated narrative explanations.
    """
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        # Corporate color palette
        self.primary_color = colors.HexColor("#0f3d30")  # Deep Forest Teal
        self.secondary_color = colors.HexColor("#d9822b") # Muted Amber/Gold
        self.dark_neutral = colors.HexColor("#2d3748")    # Slate Charcoal
        self.light_neutral = colors.HexColor("#f7fafc")   # Cream Off-White
        
        # Color codes for risk categories
        self.risk_colors = {
            "Low": colors.HexColor("#2f855a"),    # Forest Green
            "Medium": colors.HexColor("#dd6b20"), # Muted Orange
            "High": colors.HexColor("#c53030")    # Deep Crimson
        }

    def generate_trend_chart(self, risk_data: Dict[str, Any], filename: str = "risk_trends.png") -> str:
        """
        Generates a line plot showing the trajectory of the 9 risk parameters over time.
        """
        chart_path = os.path.join(self.output_dir, filename)
        risk_proj = risk_data.get("risk_projections", {})
        
        # Build pandas DataFrame for easy plotting
        plot_data = []
        for year, params in sorted(risk_proj.items()):
            for p_name, vals in params.items():
                p_label = p_name.replace("_", " ").title()
                plot_data.append({
                    "Year": year,
                    "Risk Score": vals["score"],
                    "Parameter": p_label
                })
        
        import pandas as pd
        df = pd.DataFrame(plot_data)
        
        # Render plot
        plt.figure(figsize=(9, 4.5))
        sns.set_theme(style="whitegrid")
        
        # Plot lines with clean markers
        ax = sns.lineplot(
            data=df, 
            x="Year", 
            y="Risk Score", 
            hue="Parameter", 
            marker="o", 
            linewidth=2.5,
            palette="Spectral"
        )
        
        plt.title("Climate Risk Projections Trajectory (2030 - 2050)", fontsize=14, pad=15, color="#1a202c", weight="bold")
        plt.xlabel("Projected Timeline Year", fontsize=11, labelpad=8)
        plt.ylabel("Risk Vulnerability Score (0 - 100)", fontsize=11, labelpad=8)
        plt.ylim(-5, 105)
        plt.xticks(sorted(risk_proj.keys()))
        
        # Style legend
        plt.legend(bbox_to_anchor=(1.04, 1), loc="upper left", borderaxespad=0, frameon=True)
        plt.tight_layout()
        
        plt.savefig(chart_path, dpi=300)
        plt.close()
        return chart_path

    def compile_pdf_report(
        self, 
        asset_info: Dict[str, Any], 
        risk_data: Dict[str, Any], 
        explanations: Dict[str, Any], 
        esg_alignment: Dict[str, Any],
        marketplace_recs: List[Dict[str, Any]],
        output_filename: str = "Climate_Risk_Report.pdf"
    ) -> str:
        """
        Compiles the complete ReportLab PDF structure incorporating texts, tables, and charts.
        """
        pdf_path = os.path.join(self.output_dir, output_filename)
        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=letter,
            rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54
        )
        
        styles = getSampleStyleSheet()
        
        # Modify existing styles to avoid conflicts, or add new unique styles
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=self.primary_color,
            spaceAfter=15
        )
        
        h1_style = ParagraphStyle(
            "ReportH1",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=self.primary_color,
            spaceBefore=15,
            spaceAfter=8,
            keepWithNext=True
        )

        h2_style = ParagraphStyle(
            "ReportH2",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=self.secondary_color,
            spaceBefore=10,
            spaceAfter=4,
            keepWithNext=True
        )
        
        body_style = ParagraphStyle(
            "ReportBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=self.dark_neutral,
            spaceAfter=8
        )
        
        table_cell_style = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=11,
            textColor=self.dark_neutral
        )

        table_header_style = ParagraphStyle(
            "TableHeader",
            parent=table_cell_style,
            fontName="Helvetica-Bold",
            textColor=colors.white
        )

        story = []
        
        # --- TITLE BLOCK ---
        story.append(Paragraph("PRANA EARTH PREDICT PLATFORM", h2_style))
        story.append(Paragraph("Climate Risk & Vulnerability Assessment Report", title_style))
        story.append(Spacer(1, 0.1 * inch))
        
        # --- METADATA SECTION ---
        meta_data = [
            [Paragraph("<b>Asset Name:</b>", table_cell_style), Paragraph(asset_info.get("name", "N/A"), table_cell_style),
             Paragraph("<b>Assessment Date:</b>", table_cell_style), Paragraph(asset_info.get("date", "N/A"), table_cell_style)],
            [Paragraph("<b>Asset Type:</b>", table_cell_style), Paragraph(asset_info.get("type", "N/A").replace("_", " ").title(), table_cell_style),
             Paragraph("<b>Latitude / Longitude:</b>", table_cell_style), Paragraph(f"{asset_info.get('latitude', 0.0)}, {asset_info.get('longitude', 0.0)}", table_cell_style)],
            [Paragraph("<b>Address:</b>", table_cell_style), Paragraph(asset_info.get("address", "N/A"), table_cell_style),
             Paragraph("<b>Climate Scenario:</b>", table_cell_style), Paragraph(risk_data.get("scenario", "SSP2-4.5").upper(), table_cell_style)]
        ]
        meta_table = Table(meta_data, colWidths=[1.2*inch, 2.3*inch, 1.5*inch, 2.0*inch])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), self.light_neutral),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e0")),
            ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor("#e2e8f0")),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 0.25 * inch))
        
        # --- EXECUTIVE SUMMARY ---
        story.append(Paragraph("Executive Summary", h1_style))
        exec_text = explanations.get("executive_summary", "Summary not generated.")
        story.append(Paragraph(exec_text, body_style))
        story.append(Spacer(1, 0.2 * inch))
        
        # --- RISK MATRIX TABLE ---
        story.append(Paragraph("Climate Risk Projections Matrix", h1_style))
        
        # Headers: Parameter | 2030 | 2035 | 2040 | 2050
        years = sorted(risk_data["risk_projections"].keys())
        matrix_headers = ["Risk Parameter"] + [str(y) for y in years]
        matrix_data = [ [Paragraph(h, table_header_style) for h in matrix_headers] ]
        
        # Gather all risk parameters
        sample_year = years[0]
        params_keys = list(risk_data["risk_projections"][sample_year].keys())
        
        for p_key in params_keys:
            row = [Paragraph(p_key.replace("_", " ").title(), table_cell_style)]
            for year in years:
                val = risk_data["risk_projections"][year][p_key]
                score = val["score"]
                rating = val["rating"]
                
                # Style cell color according to rating
                cell_color_hex = self.risk_colors.get(rating, colors.black).hexval()
                cell_html = f"<font color='{cell_color_hex}'><b>{score} ({rating})</b></font>"
                row.append(Paragraph(cell_html, table_cell_style))
            matrix_data.append(row)
            
        matrix_table = Table(matrix_data, colWidths=[2.5*inch] + [1.1*inch]*len(years))
        matrix_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), self.primary_color),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, self.light_neutral]),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e0")),
            ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor("#e2e8f0")),
        ]))
        story.append(matrix_table)
        story.append(PageBreak()) # Clean page break for visualization and text
        
        # --- CHART VISUALIZATION ---
        story.append(Paragraph("Climate Projections Trend Chart", h1_style))
        chart_file = self.generate_trend_chart(risk_data)
        story.append(Image(chart_file, width=6.5*inch, height=3.2*inch))
        story.append(Spacer(1, 0.25 * inch))
        
        # --- PARAMETER NARRATIVES ---
        story.append(Paragraph("Detailed Risk Driver Explanations", h1_style))
        param_narratives = explanations.get("parameter_explanations", {})
        for p_key in params_keys:
            p_title = p_key.replace("_", " ").title()
            p_desc = param_narratives.get(p_key, "Explanation not provided.")
            
            # Find the final year risk level
            final_year = years[-1]
            final_val = risk_data["risk_projections"][final_year][p_key]
            final_rating = final_val["rating"]
            rating_color_hex = self.risk_colors.get(final_rating, colors.black).hexval()
            
            text_block = f"<b>{p_title}</b> (2050 Status: <font color='{rating_color_hex}'><b>{final_rating}</b></font>) — {p_desc}"
            story.append(Paragraph(text_block, body_style))
            
        story.append(PageBreak())
        
        # --- ESG ALIGNMENT ---
        story.append(Paragraph("ESG Integration & Target Alignment", h1_style))
        align_text = esg_alignment.get("alignment_summary", "Alignment summary not available.")
        story.append(Paragraph(f"<b>Strategic Alignment:</b> {align_text}", body_style))
        
        story.append(Paragraph("Identified Mitigation Gaps:", h2_style))
        gaps = esg_alignment.get("gaps_identified", [])
        if gaps:
            for gap in gaps:
                story.append(Paragraph(f"• {gap}", body_style))
        else:
            story.append(Paragraph("No critical gaps identified. Operations align with corporate filings.", body_style))
            
        story.append(Paragraph("ESG Strategic Recommendations:", h2_style))
        recs = esg_alignment.get("strategic_recommendations", [])
        for rec in recs:
            story.append(Paragraph(f"• {rec}", body_style))
            
        story.append(Spacer(1, 0.2 * inch))
        
        # --- MARKETPLACE OPPORTUNITIES ---
        story.append(Paragraph("Marketplace Adaptation Opportunities", h1_style))
        story.append(Paragraph(
            "The following adaptation and resilience project recommendations have been generated "
            "based on the highest environmental risk categories identified for this asset. Click individual "
            "links to explore mitigation details directly on the Prana Earth Marketplace.",
            body_style
        ))
        
        recs_headers = ["Project Title", "Category", "Description", "Marketplace Link"]
        recs_data = [ [Paragraph(h, table_header_style) for h in recs_headers] ]
        
        for project in marketplace_recs:
            title = project.get("title", "N/A")
            cat = project.get("category", "N/A")
            desc = project.get("description", "N/A")
            url = project.get("marketplace_url", "https://marketplace.pranaearth.com")
            
            link_html = f"<font color='#0066cc'><a href='{url}'>Explore Project</a></font>"
            recs_data.append([
                Paragraph(f"<b>{title}</b>", table_cell_style),
                Paragraph(cat, table_cell_style),
                Paragraph(desc, table_cell_style),
                Paragraph(link_html, table_cell_style)
            ])
            
        recs_table = Table(recs_data, colWidths=[1.8*inch, 1.2*inch, 2.5*inch, 1.5*inch])
        recs_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), self.primary_color),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 6),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, self.light_neutral]),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e0")),
            ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor("#e2e8f0")),
        ]))
        story.append(recs_table)
        
        # Build Document
        doc.build(story)
        return pdf_path
