import pandas as pd
import numpy as np
import matplotlib
matplotlib .use ('Agg')
import matplotlib .pyplot as plt
import plotly .express as px
import plotly .graph_objects as go
import plotly .utils
import seaborn as sns
from services .mixins .serialization_mixin import SerializationMixin
import os
import json
from io import StringIO
from typing import Dict ,Any ,Tuple ,Optional ,List
import uuid
from datetime import datetime
import re
from collections import defaultdict
from scipy import stats
from sklearn .preprocessing import StandardScaler
from sklearn .cluster import KMeans
from sklearn .decomposition import PCA
import warnings
warnings .filterwarnings ('ignore')

plt .style .use ('dark_background')
sns .set_theme (style ="darkgrid",palette ="viridis")

class DataService (SerializationMixin ):
    def __init__ (self ,static_dir :str ='static'):
        self .static_dir =static_dir
        self .current_data =None
        self .data_info ={}
        self .data_context ={}
        self .analysis_history =[]
        self .column_meanings ={}
        self .insights_cache ={}

    def get_data_profile (self )->Dict [str ,Any ]:
        """Return a compact dataset profile.

        Safe to call even when no dataset is loaded. In that case, returns
        a stub object with loaded=False so callers can handle gracefully.
        """
        if self .current_data is None :
            return {
            'loaded':False ,
            'message':'No dataset loaded'
            }

        if not self .data_info :
            self .data_info =self ._generate_data_info ()
        if not self .data_context :
            self .data_context =self ._build_data_context ()

        profile ={
        'loaded':True ,
        'shape':self .current_data .shape ,
        'columns':list (self .current_data .columns ),
        'summary':self .get_summary_stats (),
        'quality':self .get_data_quality (),
        'info':self .data_info ,
        'context':self .data_context ,
        }
        return self ._json_safe (profile )

    def get_column_summaries (self )->Dict [str ,Any ]:
        """Return per-column summaries used by AI chat context.

        Falls back to an empty dict when no dataset is loaded.
        """
        if self .current_data is None :
            return {}
        summaries :Dict [str ,Any ]={}
        for col in self .current_data .columns :
            summaries [col ]=self ._get_column_detailed_info (col )
        return self ._json_safe (summaries )

    def suggest_analyses (self ,message :Optional [str ]=None )->List [str ]:
        """Public wrapper around internal suggestions with light intent boost.

        - Uses internal heuristics to suggest analyses based on data type.
        - Optionally boosts suggestions using keywords from the user's message.
        """
        base =self ._suggest_analyses ()
        if message :
            m =message .lower ()
            if any (k in m for k in ['trend','time','over time']):
                base .insert (0 ,'Trend analysis over time')
            if any (k in m for k in ['correlation','correlate','relationship']):
                base .insert (0 ,'Correlation analysis between numeric variables')
            if any (k in m for k in ['outlier','anomaly','unusual']):
                base .insert (0 ,'Outlier detection on key numeric columns')

        seen =set ()
        deduped =[]
        for s in base :
            if s not in seen :
                seen .add (s )
                deduped .append (s )
        return deduped [:10 ]

    def get_data_quality (self )->Dict [str ,Any ]:
        """Calculate data quality metrics for the current dataset"""
        if self .current_data is None :
            raise ValueError ("No data loaded")

        quality_metrics ={
        'completeness':{},
        'uniqueness':{},
        'data_types':{},
        'statistics':{}
        }

        for column in self .current_data .columns :

            missing_count =self .current_data [column ].isnull ().sum ()
            total_count =len (self .current_data )
            completeness =1 -(missing_count /total_count )
            quality_metrics ['completeness'][column ]={
            'score':round (completeness *100 ,2 ),
            'missing_count':int (missing_count )
            }

            unique_count =self .current_data [column ].nunique ()
            uniqueness =unique_count /total_count
            quality_metrics ['uniqueness'][column ]={
            'score':round (uniqueness *100 ,2 ),
            'unique_count':int (unique_count )
            }

            dtype =str (self .current_data [column ].dtype )
            quality_metrics ['data_types'][column ]=dtype

            if pd .api .types .is_numeric_dtype (self .current_data [column ].dtype ):
                stats ={
                'min':float (self .current_data [column ].min ()),
                'max':float (self .current_data [column ].max ()),
                'mean':float (self .current_data [column ].mean ()),
                'std':float (self .current_data [column ].std ())
                }
                quality_metrics ['statistics'][column ]=stats

        return quality_metrics

    def get_summary_stats (self )->Dict [str ,Any ]:
        """Get summary statistics for the current dataset"""
        if self .current_data is None :
            return {
            'row_count':0 ,
            'column_count':0 ,
            'memory_usage':0 ,
            'numeric_columns':[],
            'categorical_columns':[],
            'datetime_columns':[],
            'column_stats':{}
            }

        try :
            summary ={
            'row_count':len (self .current_data ),
            'column_count':len (self .current_data .columns ),
            'memory_usage':int (self .current_data .memory_usage ().sum ()),
            'numeric_columns':[],
            'categorical_columns':[],
            'datetime_columns':[],
            'column_stats':{}
            }

            for column in self .current_data .columns :
                col_summary ={
                'dtype':str (self .current_data [column ].dtype ),
                'unique_count':int (self .current_data [column ].nunique ()),
                'missing_count':int (self .current_data [column ].isnull ().sum ())
                }

                if pd .api .types .is_numeric_dtype (self .current_data [column ].dtype ):
                    summary ['numeric_columns'].append (column )
                    col_summary .update ({
                    'min':float (self .current_data [column ].min ()),
                    'max':float (self .current_data [column ].max ()),
                    'mean':float (self .current_data [column ].mean ()),
                    'median':float (self .current_data [column ].median ()),
                    'std':float (self .current_data [column ].std ())
                    })
                elif self .current_data [column ].dtype =='datetime64[ns]':
                    summary ['datetime_columns'].append (column )
                    col_summary .update ({
                    'min':str (self .current_data [column ].min ()),
                    'max':str (self .current_data [column ].max ())
                    })
                else :
                    summary ['categorical_columns'].append (column )
                    if col_summary ['unique_count']<=10 :
                        value_counts =self .current_data [column ].value_counts ()
                        col_summary ['value_counts']={
                        str (k ):int (v )for k ,v in value_counts .items ()
                        }

                summary ['column_stats'][column ]=col_summary

            return summary

        except Exception as e :
            return {
            'error':f'Error generating summary stats: {str(e)}',
            'row_count':0 ,
            'column_count':0 ,
            'memory_usage':0 ,
            'numeric_columns':[],
            'categorical_columns':[],
            'datetime_columns':[],
            'column_stats':{}
            }

    def load_data (self ,file_path :str ,file_type :str ='csv')->Dict [str ,Any ]:
        """Load dataset from file with enhanced context awareness"""
        try :
            if file_type .lower ()=='csv':
                self .current_data =pd .read_csv (file_path )
            elif file_type .lower ()in ['xlsx','xls']:
                self .current_data =pd .read_excel (file_path )
            else :
                return {"error":"Unsupported file type"}

            self .data_context ={}
            self .analysis_history =[]
            self .column_meanings ={}
            self .insights_cache ={}

            self .data_info =self ._generate_data_info ()
            self .data_context =self ._build_data_context ()

            data_dict =self .current_data .to_dict ('records')
            columns =list (self .current_data .columns )

            def is_numeric (col ):
                dtype =self .current_data [col ].dtype
                return pd .api .types .is_numeric_dtype (dtype )

            numeric_columns =[col for col in columns if is_numeric (col )]
            categorical_columns =[col for col in columns if col not in numeric_columns ]

            for col in numeric_columns :
                if not pd .api .types .is_numeric_dtype (self .current_data [col ].dtype ):
                    self .current_data [col ]=pd .to_numeric (self .current_data [col ],errors ='coerce')

            column_types ={}
            for col in columns :
                if col in numeric_columns :
                    column_types [col ]='number'
                else :
                    column_types [col ]='text'

            result ={
            "success":True ,
            "data":data_dict ,
            "columns":columns ,
            "numeric_columns":numeric_columns ,
            "categorical_columns":categorical_columns ,
            "column_types":column_types ,
            "total_rows":len (self .current_data ),
            "shape":self .current_data .shape ,
            "data_types":{col :str (dtype )for col ,dtype in self .current_data .dtypes .to_dict ().items ()},
            "info":self .data_info ,
            "context":self .data_context ,
            "ai_summary":self ._generate_ai_data_summary ()
            }
            return self ._json_safe (result )

        except Exception as e :
            return {"error":f"Failed to load data: {str(e)}"}

    def _generate_data_info (self )->Dict [str ,Any ]:
        """Generate comprehensive dataset information"""
        if self .current_data is None :
            return {}

        numeric_cols =self .current_data .select_dtypes (include ='number').columns .tolist ()
        categorical_cols =self .current_data .select_dtypes (exclude ='number').columns .tolist ()
        date_cols =self ._detect_date_columns ()

        info ={
        "total_rows":len (self .current_data ),
        "total_columns":len (self .current_data .columns ),
        "numeric_columns":numeric_cols ,
        "categorical_columns":categorical_cols ,
        "date_columns":date_cols ,
        "missing_values":self .current_data .isnull ().sum ().to_dict (),
        "data_quality":self ._assess_data_quality (),
        "column_stats":self ._generate_column_statistics (),
        "sample_data":self .current_data .head (3 ).to_dict ('records'),
        "data_patterns":self ._detect_data_patterns (),
        "uniformity_issues":self ._detect_uniformity_issues ()
        }

        return info

    def _detect_uniformity_issues (self )->Dict [str ,List [str ]]:
        """Detect uniformity issues in the dataset"""
        if self .current_data is None :
            return {}

        issues ={
        "constant_columns":[],
        "near_constant_columns":[],
        "duplicate_columns":[],
        "low_variance_columns":[]
        }

        for col in self .current_data .columns :
            unique_values =self .current_data [col ].nunique ()
            total_values =len (self .current_data [col ].dropna ())

            if unique_values ==1 :
                issues ["constant_columns"].append (col )

            elif unique_values >1 :
                value_counts =self .current_data [col ].value_counts ()
                if value_counts .iloc [0 ]/total_values >0.95 :
                    issues ["near_constant_columns"].append (col )

            if pd .api .types .is_numeric_dtype (self .current_data [col ].dtype ):
                if self .current_data [col ].var ()<0.01 :
                    issues ["low_variance_columns"].append (col )

        numeric_df =self .current_data .select_dtypes (include ='number')
        if numeric_df .shape [1 ]>1 :
            correlation_matrix =numeric_df .corr ()
            for i in range (len (correlation_matrix .columns )):
                for j in range (i +1 ,len (correlation_matrix .columns )):
                    if abs (correlation_matrix .iloc [i ,j ])>0.999 :
                        col1 ,col2 =correlation_matrix .columns [i ],correlation_matrix .columns [j ]
                        issues ["duplicate_columns"].append (f"{col1} ≈ {col2}")

        return issues

    def _build_data_context (self )->Dict [str ,Any ]:
        """Build context about the dataset for AI understanding"""
        context ={
        "dataset_type":self ._infer_dataset_type (),
        "potential_analyses":self ._suggest_analyses (),
        "key_relationships":self ._identify_key_relationships (),
        "business_context":self ._infer_business_context (),
        "recommended_visualizations":self ._recommend_visualizations (),
        "data_story":self ._generate_data_story ()
        }
        return context

    def get_analytics_dashboard (self )->Dict [str ,Any ]:
        """Generate comprehensive analytics dashboard"""
        if self .current_data is None :
            return {"error":"No dataset loaded"}

        dashboard ={
        "summary_statistics":self ._get_comprehensive_statistics (),
        "data_quality_report":self ._get_data_quality_report (),
        "correlation_matrix":self ._get_correlation_insights (),
        "distribution_analysis":self ._get_distribution_analysis (),
        "categorical_analysis":self ._get_categorical_analysis (),
        "missing_values_analysis":self ._get_missing_values_analysis (),
        "outlier_detection":self ._detect_outliers_comprehensive (),
        "charts":self ._generate_dashboard_charts (),
        "ai_insights":self ._generate_comprehensive_ai_insights (),
        "recommendations":self ._get_analysis_recommendations ()
        }
        return self ._json_safe (dashboard )

    def _get_comprehensive_statistics (self )->Dict [str ,Any ]:
        """Get comprehensive statistical analysis"""
        numeric_cols =self .current_data .select_dtypes (include ='number').columns
        stats_data ={}

        for col in numeric_cols :
            col_data =self .current_data [col ].dropna ()
            if len (col_data )>0 :
                stats_data [col ]={
                "count":int (len (col_data )),
                "mean":float (col_data .mean ()),
                "median":float (col_data .median ()),
                "mode":float (col_data .mode ().iloc [0 ])if len (col_data .mode ())>0 else None ,
                "std":float (col_data .std ()),
                "variance":float (col_data .var ()),
                "min":float (col_data .min ()),
                "max":float (col_data .max ()),
                "q25":float (col_data .quantile (0.25 )),
                "q75":float (col_data .quantile (0.75 )),
                "iqr":float (col_data .quantile (0.75 )-col_data .quantile (0.25 )),
                "skewness":float (col_data .skew ()),
                "kurtosis":float (col_data .kurtosis ()),
                "range":float (col_data .max ()-col_data .min ()),
                "coefficient_of_variation":float (col_data .std ()/col_data .mean ()*100 )if col_data .mean ()!=0 else 0
                }

        return {
        "numeric_statistics":stats_data ,
        "overall_summary":{
        "total_rows":len (self .current_data ),
        "total_columns":len (self .current_data .columns ),
        "numeric_columns":len (numeric_cols ),
        "categorical_columns":len (self .current_data .select_dtypes (exclude ='number').columns ),
        "missing_cells":int (self .current_data .isnull ().sum ().sum ()),
        "complete_rows":int (len (self .current_data .dropna ())),
        "data_completeness_percentage":float (len (self .current_data .dropna ())/len (self .current_data )*100 )
        }
        }

    def _get_data_quality_report (self )->Dict [str ,Any ]:
        """Generate comprehensive data quality report"""
        quality_issues =[]
        column_quality ={}

        for col in self .current_data .columns :
            col_data =self .current_data [col ]
            col_quality ={
            "completeness":float ((len (col_data )-col_data .isnull ().sum ())/len (col_data )*100 ),
            "uniqueness":float (col_data .nunique ()/len (col_data )*100 ),
            "issues":[]
            }

            if col_data .isnull ().sum ()>len (col_data )*0.1 :
                col_quality ["issues"].append ("high_missing_values")
                quality_issues .append (f"Column '{col}' has {col_data.isnull().sum()} missing values ({col_data.isnull().sum()/len(col_data)*100:.1f}%)")

            if col_data .nunique ()==1 :
                col_quality ["issues"].append ("constant_values")
                quality_issues .append (f"Column '{col}' has constant values")

            if col_data .dtype =='object':

                string_lengths =col_data .dropna ().astype (str ).str .len ()
                if string_lengths .var ()>string_lengths .mean ()*2 :
                    col_quality ["issues"].append ("inconsistent_formatting")

            column_quality [col ]=col_quality

        return {
        "overall_quality_score":float (np .mean ([cq ["completeness"]for cq in column_quality .values ()])),
        "column_quality":column_quality ,
        "quality_issues":quality_issues ,
        "recommendations":self ._get_quality_recommendations (column_quality )
        }

    def _get_correlation_insights (self )->Dict [str ,Any ]:
        """Get correlation analysis with insights"""
        numeric_cols =self .current_data .select_dtypes (include ='number').columns

        if len (numeric_cols )<2 :
            return {"message":"Need at least 2 numeric columns for correlation analysis"}

        corr_matrix =self .current_data [numeric_cols ].corr ()

        strong_correlations =[]
        for i in range (len (corr_matrix .columns )):
            for j in range (i +1 ,len (corr_matrix .columns )):
                corr_val =corr_matrix .iloc [i ,j ]
                if abs (corr_val )>0.7 :
                    strong_correlations .append ({
                    "variable_1":corr_matrix .columns [i ],
                    "variable_2":corr_matrix .columns [j ],
                    "correlation":float (corr_val ),
                    "strength":"strong positive"if corr_val >0.7 else "strong negative",
                    "interpretation":self ._interpret_correlation (corr_matrix .columns [i ],corr_matrix .columns [j ],corr_val )
                    })

        return {
        "correlation_matrix":corr_matrix .to_dict (),
        "strong_correlations":strong_correlations ,
        "correlation_summary":{
        "highest_positive":self ._get_highest_correlation (corr_matrix ,positive =True ),
        "highest_negative":self ._get_highest_correlation (corr_matrix ,positive =False ),
        "total_strong_correlations":len (strong_correlations )
        }
        }

    def _get_distribution_analysis (self )->Dict [str ,Any ]:
        """Analyze distributions of numeric columns"""
        numeric_cols =self .current_data .select_dtypes (include ='number').columns
        distributions ={}

        for col in numeric_cols :
            col_data =self .current_data [col ].dropna ()
            if len (col_data )>0 :

                dist_info ={
                "distribution_type":self ._identify_distribution_type (col_data ),
                "normality_test":self ._test_normality (col_data ),
                "outliers":self ._detect_outliers_column (col_data ),
                "percentiles":{
                f"p{p}":float (col_data .quantile (p /100 ))
                for p in [1 ,5 ,10 ,25 ,50 ,75 ,90 ,95 ,99 ]
                }
                }
                distributions [col ]=dist_info

        return distributions

    def _get_categorical_analysis (self )->Dict [str ,Any ]:
        """Analyze categorical columns"""
        categorical_cols =self .current_data .select_dtypes (exclude ='number').columns
        categorical_analysis ={}

        for col in categorical_cols :
            col_data =self .current_data [col ].dropna ()
            value_counts =col_data .value_counts ()

            categorical_analysis [col ]={
            "unique_count":int (col_data .nunique ()),
            "most_common":value_counts .head (5 ).to_dict (),
            "least_common":value_counts .tail (5 ).to_dict (),
            "diversity_index":float (self ._calculate_diversity_index (value_counts )),
            "concentration":float (value_counts .iloc [0 ]/len (col_data )*100 )if len (value_counts )>0 else 0 ,
            "category_distribution":"uniform"if value_counts .std ()<value_counts .mean ()*0.5 else "skewed"
            }

        return categorical_analysis

    def _generate_dashboard_charts (self )->Dict [str ,Any ]:
        """Generate charts for the analytics dashboard"""
        charts ={}

        try :

            numeric_cols =self .current_data .select_dtypes (include ='number').columns [:4 ]
            for col in numeric_cols :
                chart_data =self ._create_distribution_chart (col )
                if chart_data :
                    charts [f"{col}_distribution"]=chart_data

            if len (numeric_cols )>=2 :
                charts ["correlation_heatmap"]=self ._create_correlation_heatmap ()

            charts ["missing_values"]=self ._create_missing_values_chart ()

            categorical_cols =self .current_data .select_dtypes (exclude ='number').columns [:2 ]
            for col in categorical_cols :
                chart_data =self ._create_category_chart (col )
                if chart_data :
                    charts [f"{col}_categories"]=chart_data

        except Exception as e :
            charts ["error"]=f"Error generating charts: {str(e)}"

        return charts

    def get_brief_summary (self )->str :
        """Generate an intelligent, context-aware summary of the dataset"""
        if self .current_data is None :
            return "No dataset is currently loaded."

        try :

            column_patterns =self ._analyze_column_patterns ()
            relationships =self ._detect_column_relationships ()
            key_metrics =self ._identify_key_metrics ()
            data_quality =self ._assess_data_quality ()
            temporal_aspects =self ._analyze_temporal_aspects ()

            profile ={
            'primary_entity':self ._infer_primary_entity (),
            'key_dimensions':self ._identify_dimensions (),
            'metrics':key_metrics ,
            'temporal_range':temporal_aspects .get ('range'),
            'data_quality':{
            'completeness':data_quality .get ('completeness',0 ),
            'consistency':data_quality .get ('consistency',0 ),
            'issues':data_quality .get ('issues',[])
            },
            'relationships':relationships ,
            'patterns':column_patterns
            }

            summary_parts =[]

            summary_parts .append (f"This dataset contains {self._get_entity_description(profile)}")

            if profile ['metrics']:
                summary_parts .append (f"Key metrics include {', '.join(profile['metrics'][:3])}")
            if profile ['key_dimensions']:
                summary_parts .append (f"analyzed across {', '.join(profile['key_dimensions'][:3])}")

            if profile ['temporal_range']:
                summary_parts .append (f"covering {profile['temporal_range']}")

            if profile ['data_quality']['issues']:
                summary_parts .append ("Note: "+self ._format_data_quality_message (profile ['data_quality']))

            analysis_suggestions =self ._generate_analysis_suggestions (profile )
            if analysis_suggestions :
                summary_parts .append ("\nSuggested analyses: "+analysis_suggestions [0 ])

            return " ".join (summary_parts )

        except Exception as e :
            return "This is a dataset with "+", ".join (self .current_data .columns )

    def _analyze_column_patterns (self )->dict :
        """Analyze patterns and characteristics of each column"""
        patterns ={}

        for column in self .current_data .columns :
            col_data =self .current_data [column ]
            patterns [column ]={
            'type':str (col_data .dtype ),
            'unique_count':col_data .nunique (),
            'missing_pct':(col_data .isna ().sum ()/len (col_data ))*100 ,
            'sample_values':col_data .dropna ().unique ()[:5 ].tolist (),
            'distribution_type':self ._detect_distribution_type (col_data ),
            'potential_role':self ._infer_column_role (column ,col_data )
            }

        return patterns

    def _detect_column_relationships (self )->list :
        """Detect potential relationships between columns"""
        relationships =[]
        numeric_cols =self .current_data .select_dtypes (include ='number').columns

        if len (numeric_cols )>1 :
            corr_matrix =self .current_data [numeric_cols ].corr ()
            strong_correlations =[]
            for i in range (len (numeric_cols )):
                for j in range (i +1 ,len (numeric_cols )):
                    corr =corr_matrix .iloc [i ,j ]
                    if abs (corr )>0.7 :
                        strong_correlations .append ({
                        'columns':[numeric_cols [i ],numeric_cols [j ]],
                        'correlation':corr ,
                        'type':'strong_correlation'
                        })
            relationships .extend (strong_correlations )

        cat_cols =self .current_data .select_dtypes (exclude ='number').columns
        for col1 in cat_cols :
            for col2 in cat_cols :
                if col1 <col2 :
                    relation =self ._analyze_categorical_relationship (col1 ,col2 )
                    if relation :
                        relationships .append (relation )

        return relationships

    def _identify_key_metrics (self )->list :
        """Identify potential key metrics in the dataset"""
        metrics =[]
        numeric_cols =self .current_data .select_dtypes (include ='number').columns

        for col in numeric_cols :

            if any (term in col .lower ()for term in ['amount','price','cost','revenue','profit',
            'count','quantity','score','rate','ratio']):
                metrics .append ({
                'name':col ,
                'type':'metric',
                'aggregation':self ._suggest_aggregation (col ),
                'range':[float (self .current_data [col ].min ()),float (self .current_data [col ].max ())],
                'distribution':self ._summarize_distribution (self .current_data [col ])
                })

        return metrics

    def _analyze_temporal_aspects (self )->dict :
        """Analyze temporal aspects of the dataset"""
        temporal_info ={'has_temporal':False ,'columns':[],'range':None }

        date_columns =[]
        for col in self .current_data .columns :
            if self ._is_temporal_column (col ):
                date_columns .append (col )

        if date_columns :
            temporal_info ['has_temporal']=True
            temporal_info ['columns']=date_columns

            for col in date_columns :
                try :
                    col_data =pd .to_datetime (self .current_data [col ])
                    date_range =f"from {col_data.min().strftime('%Y-%m-%d')} to {col_data.max().strftime('%Y-%m-%d')}"
                    temporal_info ['range']=date_range
                    break
                except :
                    continue

        return temporal_info

    def _generate_analysis_suggestions (self ,profile :dict )->list :
        """Generate intelligent analysis suggestions based on dataset profile"""
        suggestions =[]

        if profile ['temporal_range']:
            suggestions .append ("Trend analysis over time")

        if profile ['metrics']and profile ['key_dimensions']:
            suggestions .append (f"Breakdown of {profile['metrics'][0]} by {profile['key_dimensions'][0]}")

        if len (profile ['metrics'])>1 :
            suggestions .append (f"Correlation analysis between {' and '.join(profile['metrics'][:2])}")

        return suggestions

    def get_ai_dataset_context (self )->str :
        """Get comprehensive dataset context for AI consumption"""
        if self .current_data is None :
            return "No dataset is currently loaded."

        context_parts =[]

        context_parts .append (f"Dataset Overview:")
        context_parts .append (f"- {len(self.current_data)} rows and {len(self.current_data.columns)} columns")
        context_parts .append (f"- Columns: {', '.join(self.current_data.columns.tolist())}")

        numeric_cols =self .current_data .select_dtypes (include ='number').columns .tolist ()
        categorical_cols =self .current_data .select_dtypes (exclude ='number').columns .tolist ()

        if numeric_cols :
            context_parts .append (f"- Numeric columns: {', '.join(numeric_cols)}")
        if categorical_cols :
            context_parts .append (f"- Categorical columns: {', '.join(categorical_cols)}")

        context_parts .append (f"\nSample Data (first 3 rows):")
        sample_data =self .current_data .head (3 ).to_string (index =False ,max_cols =10 )
        context_parts .append (sample_data )

        if numeric_cols :
            context_parts .append (f"\nKey Statistics:")
            for col in numeric_cols [:5 ]:
                col_data =self .current_data [col ].dropna ()
                if len (col_data )>0 :
                    context_parts .append (f"- {col}: mean={col_data.mean():.2f}, std={col_data.std():.2f}, range=[{col_data.min():.2f}, {col_data.max():.2f}]")

        missing_info =self .current_data .isnull ().sum ()
        if missing_info .sum ()>0 :
            context_parts .append (f"\nMissing Values:")
            for col ,missing_count in missing_info [missing_info >0 ].items ():
                pct =(missing_count /len (self .current_data ))*100
                context_parts .append (f"- {col}: {missing_count} ({pct:.1f}%)")

        if hasattr (self ,'data_context')and self .data_context :
            context_parts .append (f"\nData Patterns: {', '.join(self.data_info.get('data_patterns', []))}")
            context_parts .append (f"Dataset Type: {self.data_context.get('dataset_type', 'Unknown')}")

        return "\n".join (context_parts )

    def query_dataset_for_ai (self ,question :str )->Dict [str ,Any ]:
        """Process AI queries about the dataset with contextual analysis"""
        if self .current_data is None :
            return {"error":"No dataset loaded","context":"Please load a dataset first."}

        question_lower =question .lower ()
        result ={"question":question ,"answer":"","data":{},"context":""}

        try :

            mentioned_cols =self ._extract_columns_from_query (question )
            if mentioned_cols :
                result ["mentioned_columns"]=mentioned_cols
                result ["data"]["column_info"]={}
                for col in mentioned_cols :
                    result ["data"]["column_info"][col ]=self ._get_column_detailed_info (col )

            if any (word in question_lower for word in ['average','mean','median','sum','total']):
                numeric_cols =mentioned_cols if mentioned_cols else self .current_data .select_dtypes (include ='number').columns .tolist ()
                result ["data"]["statistics"]={}
                for col in numeric_cols [:5 ]:
                    col_data =self .current_data [col ].dropna ()
                    if len (col_data )>0 :
                        result ["data"]["statistics"][col ]={
                        "mean":float (col_data .mean ()),
                        "median":float (col_data .median ()),
                        "sum":float (col_data .sum ()),
                        "count":int (len (col_data ))
                        }

            if any (word in question_lower for word in ['distribution','spread','range','histogram']):
                cols_to_analyze =mentioned_cols if mentioned_cols else self .current_data .select_dtypes (include ='number').columns .tolist ()[:3 ]
                result ["data"]["distributions"]={}
                for col in cols_to_analyze :
                    result ["data"]["distributions"][col ]=self ._get_distribution_summary (col )

            if any (word in question_lower for word in ['correlation','relationship','related','connected']):
                if len (mentioned_cols )>=2 :
                    result ["data"]["correlations"]=self ._get_specific_correlations (mentioned_cols )
                else :
                    result ["data"]["correlations"]=self ._get_top_correlations ()

            if any (word in question_lower for word in ['missing','null','empty','incomplete']):
                result ["data"]["missing_analysis"]=self ._get_missing_data_analysis ()

            if any (word in question_lower for word in ['outlier','anomaly','unusual','extreme']):
                result ["data"]["outliers"]=self ._get_outlier_analysis ()

            result ["answer"]=self ._generate_contextual_answer (question ,result ["data"])
            result ["context"]=self .get_ai_dataset_context ()

        except Exception as e :
            result ["error"]=f"Error processing query: {str(e)}"

        return result

    def _detect_date_columns (self )->List [str ]:
        """Detect columns that might contain dates"""
        date_cols =[]
        for col in self .current_data .columns :
            if self .current_data [col ].dtype =='object':
                sample =self .current_data [col ].dropna ().head (10 )
                date_patterns =[
                r'\d{4}-\d{2}-\d{2}',
                r'\d{2}/\d{2}/\d{4}',
                r'\d{2}-\d{2}-\d{4}',
                ]
                for value in sample :
                    if any (re .match (pattern ,str (value ))for pattern in date_patterns ):
                        date_cols .append (col )
                        break
        return date_cols

    def _assess_data_quality (self )->Dict [str ,Any ]:
        """Assess the quality of the dataset"""
        total_cells =len (self .current_data )*len (self .current_data .columns )
        missing_cells =self .current_data .isnull ().sum ().sum ()

        quality ={
        "completeness_score":round ((1 -missing_cells /total_cells )*100 ,2 ),
        "duplicate_rows":self .current_data .duplicated ().sum (),
        "columns_with_missing_data":len ([col for col in self .current_data .columns if self .current_data [col ].isnull ().any ()]),
        "uniformity_issues":self ._detect_uniformity_issues ()
        }
        return quality

    def _generate_column_statistics (self )->Dict [str ,Dict ]:
        """Generate detailed statistics for each column"""
        stats ={}
        for col in self .current_data .columns :
            if self .current_data [col ].dtype in ['int64','float64']:
                stats [col ]={
                "type":"numeric",
                "mean":float (self .current_data [col ].mean ())if not self .current_data [col ].isnull ().all ()else None ,
                "median":float (self .current_data [col ].median ())if not self .current_data [col ].isnull ().all ()else None ,
                "std":float (self .current_data [col ].std ())if not self .current_data [col ].isnull ().all ()else None ,
                "min":float (self .current_data [col ].min ())if not self .current_data [col ].isnull ().all ()else None ,
                "max":float (self .current_data [col ].max ())if not self .current_data [col ].isnull ().all ()else None ,
                "unique_count":int (self .current_data [col ].nunique ()),
                "outliers":self ._detect_outliers (col )
                }
            else :
                stats [col ]={
                "type":"categorical",
                "unique_count":int (self .current_data [col ].nunique ()),
                "most_common":self .current_data [col ].value_counts ().head (3 ).to_dict ()if not self .current_data [col ].isnull ().all ()else {},
                "missing_count":int (self .current_data [col ].isnull ().sum ())
                }
        return stats

    def _detect_data_patterns (self )->List [str ]:
        """Detect interesting patterns in the data"""
        patterns =[]

        if self ._detect_date_columns ():
            patterns .append ("time_series_data")

        if any ('_id'in col .lower ()or 'id'==col .lower ()for col in self .current_data .columns ):
            patterns .append ("has_identifiers")

        geo_keywords =['country','state','city','region','latitude','longitude','lat','lng','zip']
        if any (keyword in col .lower ()for col in self .current_data .columns for keyword in geo_keywords ):
            patterns .append ("geographic_data")

        finance_keywords =['price','cost','revenue','profit','sales','amount','value']
        if any (keyword in col .lower ()for col in self .current_data .columns for keyword in finance_keywords ):
            patterns .append ("financial_data")

        return patterns

    def process_query (self ,query :str ,use_ai_context :bool =True )->Dict [str ,Any ]:
        """Process natural language data query with enhanced AI context"""
        if self .current_data is None :
            return {"error":"No dataset loaded"}

        self .analysis_history .append ({
        "query":query ,
        "timestamp":datetime .now ().isoformat (),
        "type":"user_query"
        })

        query_lower =query .lower ()
        result =None

        if use_ai_context :
            result =self ._ai_guided_analysis (query )

        if not result :

            if any (word in query_lower for word in ['average','mean','avg']):
                result =self ._calculate_averages (query )
            elif any (word in query_lower for word in ['correlation','correlate','relationship']):
                result =self ._analyze_correlation (query )
            elif any (word in query_lower for word in ['trend','trends','time','over time']):
                result =self ._analyze_trends (query )
            elif any (word in query_lower for word in ['distribution','histogram','spread']):
                result =self ._analyze_distribution (query )
            elif any (word in query_lower for word in ['summary','describe','overview']):
                result =self ._generate_summary ()
            elif any (word in query_lower for word in ['compare','comparison','vs','versus']):
                result =self ._compare_data (query )
            elif any (word in query_lower for word in ['top','highest','largest','maximum']):
                result =self ._find_top_values (query )
            elif any (word in query_lower for word in ['bottom','lowest','smallest','minimum']):
                result =self ._find_bottom_values (query )
            else :
                result =self ._general_analysis (query )

        if result and 'error'not in result :
            result ['query_context']=self ._analyze_query_intent (query )
            result ['ai_insights']=self ._generate_ai_insights (result )
            result ['related_analyses']=self ._suggest_related_analyses (query ,result )

            self .analysis_history .append ({
            "query":query ,
            "result":result ,
            "timestamp":datetime .now ().isoformat (),
            "type":"completed_analysis"
            })

        return result

    def _ai_guided_analysis (self ,query :str )->Optional [Dict [str ,Any ]]:
        """Use AI context to guide analysis approach"""

        mentioned_columns =self ._extract_columns_from_query (query )

        analysis_type =self ._determine_analysis_type (query ,mentioned_columns )

        if analysis_type =="smart_correlation":
            return self ._smart_correlation_analysis (mentioned_columns )
        elif analysis_type =="temporal_analysis":
            return self ._temporal_analysis (query ,mentioned_columns )
        elif analysis_type =="categorical_breakdown":
            return self ._categorical_breakdown (mentioned_columns )
        elif analysis_type =="anomaly_detection":
            return self ._detect_anomalies (mentioned_columns )

        return None

    def _extract_columns_from_query (self ,query :str )->List [str ]:
        """Extract column names mentioned in the query"""
        mentioned_cols =[]
        query_words =query .lower ().split ()

        for col in self .current_data .columns :
            col_lower =col .lower ()
            col_words =col_lower .replace ('_',' ').split ()

            if col_lower in query .lower ():
                mentioned_cols .append (col )

            elif any (word in query_words for word in col_words ):
                mentioned_cols .append (col )

        return mentioned_cols

    def _determine_analysis_type (self ,query :str ,mentioned_columns :List [str ])->str :
        """Determine the most appropriate analysis type"""
        query_lower =query .lower ()

        if self .data_context .get ('dataset_type')=='time_series'or any ('time'in pattern for pattern in self .data_info .get ('data_patterns',[])):
            if any (word in query_lower for word in ['trend','change','over time','evolution']):
                return "temporal_analysis"

        if len (mentioned_columns )>=2 and any (word in query_lower for word in ['relationship','correlation','related','affect']):
            return "smart_correlation"

        if any (col in self .data_info .get ('categorical_columns',[])for col in mentioned_columns ):
            if any (word in query_lower for word in ['by','group','category','breakdown']):
                return "categorical_breakdown"

        if any (word in query_lower for word in ['outlier','anomaly','unusual','strange','weird']):
            return "anomaly_detection"

        return "general"

    def _calculate_averages (self ,query :str )->Dict [str ,Any ]:
        """Calculate averages based on query"""
        numeric_cols =self .current_data .select_dtypes (include ='number').columns

        if len (numeric_cols )==0 :
            return {"error":"No numeric columns found"}

        averages =self .current_data [numeric_cols ].mean ().to_dict ()

        chart_path =self ._create_bar_chart (
        x =list (averages .keys ()),
        y =list (averages .values ()),
        title ="Average Values by Column",
        xlabel ="Columns",
        ylabel ="Average Value"
        )

        return {
        "analysis_type":"averages",
        "results":averages ,
        "chart_path":chart_path ,
        "insights":f"Calculated averages for {len(averages)} numeric columns"
        }

    def _analyze_correlation (self ,query :str )->Dict [str ,Any ]:
        """Analyze correlations between variables"""
        numeric_data =self .current_data .select_dtypes (include ='number')

        if len (numeric_data .columns )<2 :
            return {"error":"Need at least 2 numeric columns for correlation analysis"}

        correlation_matrix =numeric_data .corr ()

        chart_path =self ._create_correlation_heatmap (correlation_matrix )

        strong_corr =[]
        for i in range (len (correlation_matrix .columns )):
            for j in range (i +1 ,len (correlation_matrix .columns )):
                corr_val =correlation_matrix .iloc [i ,j ]
                if abs (corr_val )>0.5 :
                    strong_corr .append ({
                    'var1':correlation_matrix .columns [i ],
                    'var2':correlation_matrix .columns [j ],
                    'correlation':round (corr_val ,3 )
                    })

        return {
        "analysis_type":"correlation",
        "correlation_matrix":correlation_matrix .to_dict (),
        "strong_correlations":strong_corr ,
        "chart_path":chart_path ,
        "insights":f"Found {len(strong_corr)} strong correlations (|r| > 0.5)"
        }

    def _analyze_trends (self ,query :str )->Dict [str ,Any ]:
        """Analyze trends in data"""
        numeric_cols =self .current_data .select_dtypes (include ='number').columns

        if len (numeric_cols )==0 :
            return {"error":"No numeric columns for trend analysis"}

        x_data =range (len (self .current_data ))
        y_data =self .current_data [numeric_cols [0 ]]

        chart_path =self ._create_line_chart (
        x =x_data ,
        y =y_data ,
        title =f"Trend Analysis: {numeric_cols[0]}",
        xlabel ="Data Points",
        ylabel =numeric_cols [0 ]
        )

        slope =np .polyfit (x_data ,y_data ,1 )[0 ]
        trend_direction ="increasing"if slope >0 else "decreasing"

        return {
        "analysis_type":"trend",
        "trend_direction":trend_direction ,
        "slope":float (slope ),
        "chart_path":chart_path ,
        "insights":f"Data shows {trend_direction} trend with slope {slope:.4f}"
        }

    def _analyze_distribution (self ,query :str )->Dict [str ,Any ]:
        """Analyze data distribution"""
        numeric_cols =self .current_data .select_dtypes (include ='number').columns

        if len (numeric_cols )==0 :
            return {"error":"No numeric columns for distribution analysis"}

        col =numeric_cols [0 ]
        data =self .current_data [col ].dropna ()

        chart_path =self ._create_histogram (data ,col )

        stats ={
        "mean":float (data .mean ()),
        "median":float (data .median ()),
        "std":float (data .std ()),
        "min":float (data .min ()),
        "max":float (data .max ()),
        "skewness":float (data .skew ()),
        "kurtosis":float (data .kurtosis ())
        }

        return {
        "analysis_type":"distribution",
        "column":col ,
        "statistics":stats ,
        "chart_path":chart_path ,
        "insights":f"Distribution analysis for {col}: mean={stats['mean']:.2f}, std={stats['std']:.2f}"
        }

    def _generate_summary (self )->Dict [str ,Any ]:
        """Generate dataset summary"""
        summary =self .current_data .describe (include ='all').to_dict ()

        numeric_cols =self .current_data .select_dtypes (include ='number').columns
        if len (numeric_cols )>0 :
            means =self .current_data [numeric_cols ].mean ()
            chart_path =self ._create_bar_chart (
            x =list (means .index ),
            y =list (means .values ),
            title ="Summary: Mean Values",
            xlabel ="Columns",
            ylabel ="Mean Value"
            )
        else :
            chart_path =None

        return {
        "analysis_type":"summary",
        "summary_statistics":summary ,
        "data_info":self .data_info ,
        "chart_path":chart_path ,
        "insights":f"Dataset with {self.data_info['total_rows']} rows and {self.data_info['total_columns']} columns"
        }

    def _general_analysis (self ,query :str )->Dict [str ,Any ]:
        """General analysis fallback"""
        return self ._generate_summary ()

    def _create_bar_chart (self ,x ,y ,title ,xlabel ,ylabel )->str :
        """Create bar chart and return file path"""
        plt .figure (figsize =(10 ,6 ))
        plt .bar (x ,y ,color ='#00ff9f',alpha =0.7 )
        plt .title (title ,color ='white',fontsize =16 )
        plt .xlabel (xlabel ,color ='white')
        plt .ylabel (ylabel ,color ='white')
        plt .xticks (rotation =45 ,color ='white')
        plt .yticks (color ='white')
        plt .grid (True ,alpha =0.3 )
        plt .tight_layout ()

        filename =f"bar_chart_{uuid.uuid4().hex[:8]}.png"
        filepath =os .path .join (self .static_dir ,filename )
        plt .savefig (filepath ,facecolor ='#1a1a2e',dpi =150 ,bbox_inches ='tight')
        plt .close ()

        return filename

    def _create_line_chart (self ,x ,y ,title ,xlabel ,ylabel )->str :
        """Create line chart and return file path"""
        plt .figure (figsize =(10 ,6 ))
        plt .plot (x ,y ,color ='#00ff9f',linewidth =2 ,marker ='o',markersize =4 )
        plt .title (title ,color ='white',fontsize =16 )
        plt .xlabel (xlabel ,color ='white')
        plt .ylabel (ylabel ,color ='white')
        plt .xticks (color ='white')
        plt .yticks (color ='white')
        plt .grid (True ,alpha =0.3 )
        plt .tight_layout ()

        filename =f"line_chart_{uuid.uuid4().hex[:8]}.png"
        filepath =os .path .join (self .static_dir ,filename )
        plt .savefig (filepath ,facecolor ='#1a1a2e',dpi =150 ,bbox_inches ='tight')
        plt .close ()

        return filename

    def _create_correlation_heatmap (self ,corr_matrix )->str :
        """Create correlation heatmap"""
        plt .figure (figsize =(10 ,8 ))
        sns .heatmap (corr_matrix ,annot =True ,cmap ='viridis',center =0 ,
        square =True ,linewidths =0.5 ,cbar_kws ={"shrink":.5 })
        plt .title ('Correlation Matrix',color ='white',fontsize =16 )
        plt .tight_layout ()

        filename =f"heatmap_{uuid.uuid4().hex[:8]}.png"
        filepath =os .path .join (self .static_dir ,filename )
        plt .savefig (filepath ,facecolor ='#1a1a2e',dpi =150 ,bbox_inches ='tight')
        plt .close ()

        return filename

    def _create_histogram (self ,data ,column_name )->str :
        """Create histogram"""
        plt .figure (figsize =(10 ,6 ))
        plt .hist (data ,bins =30 ,color ='#00ff9f',alpha =0.7 ,edgecolor ='white')
        plt .title (f'Distribution of {column_name}',color ='white',fontsize =16 )
        plt .xlabel (column_name ,color ='white')
        plt .ylabel ('Frequency',color ='white')
        plt .xticks (color ='white')
        plt .yticks (color ='white')
        plt .grid (True ,alpha =0.3 )
        plt .tight_layout ()

        filename =f"histogram_{uuid.uuid4().hex[:8]}.png"
        filepath =os .path .join (self .static_dir ,filename )
        plt .savefig (filepath ,facecolor ='#1a1a2e',dpi =150 ,bbox_inches ='tight')
        plt .close ()

        return filename

    def _get_quality_recommendations (self ,column_quality :Dict )->List [str ]:
        """Generate data quality recommendations"""
        recommendations =[]
        for col ,quality in column_quality .items ():
            if "high_missing_values"in quality ["issues"]:
                recommendations .append (f"Consider imputing or removing missing values in '{col}'")
            if "constant_values"in quality ["issues"]:
                recommendations .append (f"Column '{col}' has constant values and might be removed")
            if "inconsistent_formatting"in quality ["issues"]:
                recommendations .append (f"Standardize formatting in '{col}'")
        return recommendations

    def _get_analysis_recommendations (self )->List [Dict [str ,Any ]]:
        """Provide structured analysis recommendations.

        Returns a list of dicts with: category, recommendation, reason, priority.
        This fills the missing method referenced when building the analytics dashboard.
        """
        if self .current_data is None :
            return []

        recs :List [Dict [str ,Any ]]=[]
        info =self .data_info or {}
        quality =info .get ('data_quality',{})
        column_stats =info .get ('column_stats',{})

        missing_cols =[c for c ,v in (info .get ('missing_values',{})or {}).items ()if v >0 ]
        if missing_cols :
            recs .append ({
            'category':'data_quality',
            'recommendation':'Handle missing values',
            'reason':f"{len(missing_cols)} columns contain missing data",
            'priority':'high'
            })
        if quality .get ('duplicate_rows'):
            recs .append ({
            'category':'data_quality',
            'recommendation':'Remove duplicate rows',
            'reason':f"{quality['duplicate_rows']} duplicate rows detected",
            'priority':'medium'
            })

        low_var =[c for c ,st in column_stats .items ()if st .get ('type')=='numeric'and st .get ('std')in (0 ,None )]
        if low_var :
            recs .append ({
            'category':'feature_engineering',
            'recommendation':'Drop or combine low-variance columns',
            'reason':f"{len(low_var)} numeric columns with zero/undefined variance",
            'priority':'low'
            })

        corr_highlights =self ._get_correlation_highlights ()
        if corr_highlights :
            top =corr_highlights [0 ]
            recs .append ({
            'category':'relationships',
            'recommendation':'Investigate strongest correlation',
            'reason':f"{top['var1']} ~ {top['var2']} (r={top['correlation']})",
            'priority':'medium'
            })

        outlier_summary =self ._detect_outliers_comprehensive ()
        high_outlier_cols =[c for c ,v in outlier_summary .items ()if v .get ('outlier_percentage',0 )>5 ]
        if high_outlier_cols :
            recs .append ({
            'category':'outliers',
            'recommendation':'Apply outlier treatment',
            'reason':f"Columns with >5% outliers: {', '.join(high_outlier_cols[:5])}",
            'priority':'medium'
            })

        if len (info .get ('numeric_columns',[]))>=2 :
            recs .append ({
            'category':'advanced',
            'recommendation':'Run multivariate analysis / PCA',
            'reason':'Multiple numeric columns available',
            'priority':'low'
            })
        if len (info .get ('categorical_columns',[]))and len (info .get ('numeric_columns',[])):
            recs .append ({
            'category':'segmentation',
            'recommendation':'Group numeric metrics by top categorical variable',
            'reason':'Mixed data types present',
            'priority':'medium'
            })

        seen =set ()
        unique_recs =[]
        for r in recs :
            key =(r ['category'],r ['recommendation'])
            if key not in seen :
                seen .add (key )
                unique_recs .append (r )
        return unique_recs

    def _interpret_correlation (self ,var1 :str ,var2 :str ,correlation :float )->str :
        """Interpret correlation between two variables"""
        strength ="strong"if abs (correlation )>0.7 else "moderate"if abs (correlation )>0.4 else "weak"
        direction ="positive"if correlation >0 else "negative"
        return f"{strength} {direction} relationship between {var1} and {var2}"

    def _get_highest_correlation (self ,corr_matrix ,positive =True )->Dict [str ,Any ]:
        """Get highest correlation from matrix"""

        mask =np .triu (np .ones_like (corr_matrix ,dtype =bool ))
        corr_values =corr_matrix .mask (mask )

        if positive :
            max_corr =corr_values .max ().max ()
            if pd .isna (max_corr ):
                return None
            max_pos =corr_values .stack ().idxmax ()
        else :
            min_corr =corr_values .min ().min ()
            if pd .isna (min_corr ):
                return None
            max_pos =corr_values .stack ().idxmin ()
            max_corr =min_corr

        return {
        "variable_1":max_pos [0 ],
        "variable_2":max_pos [1 ],
        "correlation":float (max_corr )
        }

    def _identify_distribution_type (self ,data )->str :
        """Identify the type of distribution"""
        skewness =data .skew ()
        kurtosis =data .kurtosis ()

        if abs (skewness )<0.5 and abs (kurtosis )<3 :
            return "approximately_normal"
        elif skewness >1 :
            return "right_skewed"
        elif skewness <-1 :
            return "left_skewed"
        elif kurtosis >3 :
            return "heavy_tailed"
        else :
            return "unknown"

    def _test_normality (self ,data )->Dict [str ,Any ]:
        """Test if data follows normal distribution"""
        if len (data )<3 :
            return {"test":"insufficient_data"}

        try :

            skewness =abs (data .skew ())
            kurtosis =abs (data .kurtosis ())

            is_normal =skewness <1 and kurtosis <3
            return {
            "is_approximately_normal":is_normal ,
            "skewness":float (skewness ),
            "kurtosis":float (kurtosis )
            }
        except :
            return {"test":"failed"}

    def _detect_outliers_column (self ,data )->Dict [str ,Any ]:
        """Detect outliers in a single column"""
        q1 =data .quantile (0.25 )
        q3 =data .quantile (0.75 )
        iqr =q3 -q1
        lower_bound =q1 -1.5 *iqr
        upper_bound =q3 +1.5 *iqr

        outliers =data [(data <lower_bound )|(data >upper_bound )]

        return {
        "outlier_count":len (outliers ),
        "outlier_percentage":float (len (outliers )/len (data )*100 ),
        "lower_bound":float (lower_bound ),
        "upper_bound":float (upper_bound ),
        "outlier_values":outliers .tolist ()[:10 ]
        }

    def _calculate_diversity_index (self ,value_counts )->float :
        """Calculate diversity index for categorical data"""
        proportions =value_counts /value_counts .sum ()
        return float (-np .sum (proportions *np .log (proportions +1e-10 )))

    def _create_distribution_chart (self ,column :str )->Dict [str ,Any ]:
        """Create distribution chart data for plotly"""
        col_data =self .current_data [column ].dropna ()
        if len (col_data )==0 :
            return None

        try :
            fig =px .histogram (x =col_data ,nbins =30 ,title =f'Distribution of {column}')
            fig .update_layout (
            plot_bgcolor ='rgba(0,0,0,0)',
            paper_bgcolor ='rgba(0,0,0,0)',
            font_color ='white'
            )
            return {
            "type":"histogram",
            "data":fig .to_json (),
            "column":column
            }
        except :
            return None

    def _create_correlation_heatmap (self )->Dict [str ,Any ]:
        """Create correlation heatmap data for plotly"""
        numeric_cols =self .current_data .select_dtypes (include ='number').columns
        if len (numeric_cols )<2 :
            return None

        try :
            corr_matrix =self .current_data [numeric_cols ].corr ()
            fig =px .imshow (corr_matrix ,text_auto =True ,aspect ="auto",
            title ="Correlation Heatmap")
            fig .update_layout (
            plot_bgcolor ='rgba(0,0,0,0)',
            paper_bgcolor ='rgba(0,0,0,0)',
            font_color ='white'
            )
            return {
            "type":"heatmap",
            "data":fig .to_json ()
            }
        except :
            return None

    def _create_missing_values_chart (self )->Dict [str ,Any ]:
        """Create missing values visualization"""
        missing_counts =self .current_data .isnull ().sum ()
        missing_counts =missing_counts [missing_counts >0 ]

        if len (missing_counts )==0 :
            return {"message":"No missing values found"}

        try :
            fig =px .bar (x =missing_counts .index ,y =missing_counts .values ,
            title ="Missing Values by Column")
            fig .update_layout (
            plot_bgcolor ='rgba(0,0,0,0)',
            paper_bgcolor ='rgba(0,0,0,0)',
            font_color ='white'
            )
            return {
            "type":"bar",
            "data":fig .to_json ()
            }
        except :
            return None

    def _create_category_chart (self ,column :str )->Dict [str ,Any ]:
        """Create category distribution chart"""
        value_counts =self .current_data [column ].value_counts ().head (10 )

        try :
            fig =px .bar (x =value_counts .index ,y =value_counts .values ,
            title =f'Top Categories in {column}')
            fig .update_layout (
            plot_bgcolor ='rgba(0,0,0,0)',
            paper_bgcolor ='rgba(0,0,0,0)',
            font_color ='white'
            )
            return {
            "type":"bar",
            "data":fig .to_json (),
            "column":column
            }
        except :
            return None

    def _get_column_detailed_info (self ,column :str )->Dict [str ,Any ]:
        """Get detailed information about a specific column"""
        if column not in self .current_data .columns :
            return {"error":f"Column '{column}' not found"}

        col_data =self .current_data [column ]
        info ={
        "name":column ,
        "data_type":str (col_data .dtype ),
        "total_values":len (col_data ),
        "non_null_values":int (col_data .count ()),
        "null_values":int (col_data .isnull ().sum ()),
        "unique_values":int (col_data .nunique ())
        }

        if col_data .dtype in ['int64','float64']:
            col_clean =col_data .dropna ()
            if len (col_clean )>0 :
                info .update ({
                "min":float (col_clean .min ()),
                "max":float (col_clean .max ()),
                "mean":float (col_clean .mean ()),
                "median":float (col_clean .median ()),
                "std":float (col_clean .std ())
                })
        else :
            info .update ({
            "most_common":col_data .value_counts ().head (5 ).to_dict (),
            "sample_values":col_data .dropna ().head (10 ).tolist ()
            })

        return info

    def _generate_contextual_answer (self ,question :str ,data :Dict [str ,Any ])->str :
        """Generate a contextual answer based on the query and data"""
        if not data :
            return "I couldn't find specific information to answer your question."

        answer_parts =[]

        if "statistics"in data and data ["statistics"]:
            stats =data ["statistics"]
            answer_parts .append ("Here are the key statistics:")
            for col ,stat in stats .items ():
                answer_parts .append (f"- {col}: mean={stat['mean']:.2f}, median={stat['median']:.2f}")

        if "correlations"in data and data ["correlations"]:
            corrs =data ["correlations"]
            if isinstance (corrs ,dict )and "correlations"in corrs :
                answer_parts .append ("Key correlations found:")
                for corr in corrs ["correlations"][:3 ]:
                    answer_parts .append (f"- {corr['variable_1']} and {corr['variable_2']}: {corr['correlation']:.3f}")

        return " ".join (answer_parts )if answer_parts else "Analysis completed."

    def _detect_uniformity_issues (self )->Dict [str ,Any ]:
        """Detect columns with potential uniformity or low-variance issues"""
        issues ={}
        if self .current_data is None :
            return issues
        for col in self .current_data .columns :
            series =self .current_data [col ]
            non_null =series .dropna ()
            if len (non_null )==0 :
                continue
            unique_ratio =non_null .nunique ()/len (non_null )
            if unique_ratio <0.02 :
                issues [col ]={
                "issue":"low_variance",
                "unique_ratio":float (unique_ratio ),
                "unique_values":int (non_null .nunique ())
                }
            elif non_null .nunique ()==1 :
                issues [col ]={
                "issue":"constant_column",
                "value":non_null .iloc [0 ]
                }
        return issues

    def _detect_outliers (self ,column :str )->Dict [str ,Any ]:
        """Backward-compatible wrapper for outlier detection used earlier"""
        if self .current_data is None or column not in self .current_data .columns :
            return {}
        col_data =self .current_data [column ].dropna ()
        if col_data .dtype not in ['int64','float64']or len (col_data )<5 :
            return {"outlier_count":0 }
        return self ._detect_outliers_column (col_data )

    def _infer_dataset_type (self )->str :
        """Infer the type of dataset based on columns and content"""
        if self .current_data is None :
            return "unknown"

        columns =[col .lower ()for col in self .current_data .columns ]

        if any (word in ' '.join (columns )for word in ['sales','revenue','price','amount']):
            return "sales_data"
        elif any (word in ' '.join (columns )for word in ['employee','staff','hr','salary']):
            return "hr_data"
        elif any (word in ' '.join (columns )for word in ['traffic','visits','pageviews','clicks']):
            return "web_analytics"
        elif any (word in ' '.join (columns )for word in ['temperature','humidity','weather']):
            return "weather_data"
        elif any (word in ' '.join (columns )for word in ['stock','market','trading']):
            return "financial_data"
        else :
            return "general_data"

    def _suggest_analyses (self )->List [str ]:
        """Suggest potential analyses based on data characteristics"""
        if self .current_data is None :
            return []

        suggestions =[]
        numeric_cols =self .current_data .select_dtypes (include ='number').columns
        categorical_cols =self .current_data .select_dtypes (exclude ='number').columns

        if len (numeric_cols )>1 :
            suggestions .extend ([
            "Correlation analysis between numeric variables",
            "Statistical summary of numeric data",
            "Outlier detection"
            ])

        if len (categorical_cols )>0 :
            suggestions .extend ([
            "Category distribution analysis",
            "Frequency analysis of categorical variables"
            ])

        if len (numeric_cols )>0 and len (categorical_cols )>0 :
            suggestions .append ("Cross-tabulation analysis")

        return suggestions

    def _identify_key_relationships (self )->List [str ]:
        """Identify potential key relationships in the data"""
        if self .current_data is None :
            return []

        relationships =[]
        numeric_cols =self .current_data .select_dtypes (include ='number').columns

        if len (numeric_cols )>1 :

            corr_matrix =self .current_data [numeric_cols ].corr ()
            for i in range (len (corr_matrix .columns )):
                for j in range (i +1 ,len (corr_matrix .columns )):
                    corr_val =corr_matrix .iloc [i ,j ]
                    if abs (corr_val )>0.5 :
                        relationships .append (
                        f"{corr_matrix.columns[i]} and {corr_matrix.columns[j]} "
                        f"({'positive' if corr_val > 0 else 'negative'} correlation: {corr_val:.3f})"
                        )

        return relationships

    def _infer_business_context (self )->str :
        """Infer business context from the dataset"""
        if self .current_data is None :
            return "Unknown business context"

        columns =[col .lower ()for col in self .current_data .columns ]
        dataset_type =self ._infer_dataset_type ()

        contexts ={
        "sales_data":"This appears to be sales or revenue data, useful for understanding business performance and customer behavior.",
        "hr_data":"This looks like HR or employee data, suitable for workforce analytics and performance evaluation.",
        "web_analytics":"This seems to be web analytics data, helpful for understanding user behavior and site performance.",
        "financial_data":"This appears to be financial market data, useful for investment analysis and market research.",
        "weather_data":"This looks like weather or environmental data, suitable for climate analysis and forecasting."
        }

        return contexts .get (dataset_type ,"General business data suitable for various analytical purposes.")

    def _recommend_visualizations (self )->List [str ]:
        """Recommend appropriate visualizations based on data characteristics"""
        if self .current_data is None :
            return []

        recommendations =[]
        numeric_cols =self .current_data .select_dtypes (include ='number').columns
        categorical_cols =self .current_data .select_dtypes (exclude ='number').columns

        if len (numeric_cols )>=2 :
            recommendations .extend ([
            "Scatter plots for numeric relationships",
            "Correlation heatmap",
            "Box plots for distribution comparison"
            ])

        if len (categorical_cols )>0 :
            recommendations .extend ([
            "Bar charts for category frequencies",
            "Pie charts for proportion analysis"
            ])

        if len (numeric_cols )>0 :
            recommendations .extend ([
            "Histograms for distribution analysis",
            "Line charts for trend analysis"
            ])

        return recommendations

    def _generate_data_story (self )->str :
        """Generate a narrative summary of the dataset"""
        if self .current_data is None :
            return "No data available"

        shape =self .current_data .shape
        numeric_cols =len (self .current_data .select_dtypes (include ='number').columns )
        categorical_cols =len (self .current_data .select_dtypes (exclude ='number').columns )
        missing_pct =(self .current_data .isnull ().sum ().sum ()/(shape [0 ]*shape [1 ]))*100

        story =f"This dataset contains {shape[0]} records with {shape[1]} variables. "
        story +=f"It includes {numeric_cols} numeric and {categorical_cols} categorical variables. "

        if missing_pct >5 :
            story +=f"Note that {missing_pct:.1f}% of values are missing, which may require attention. "
        elif missing_pct >0 :
            story +=f"The data is relatively complete with only {missing_pct:.1f}% missing values. "
        else :
            story +="The data appears to be complete with no missing values. "

        story +=f"Based on the column names and content, this appears to be {self._infer_dataset_type().replace('_', ' ')}."

        return story

    def _generate_ai_data_summary (self )->str :
        """Generate an AI-powered summary of the dataset"""
        if self .current_data is None :
            return "No data loaded"

        summary_parts =[]

        summary_parts .append (f"Dataset with {self.current_data.shape[0]} rows and {self.current_data.shape[1]} columns")

        numeric_count =len (self .current_data .select_dtypes (include ='number').columns )
        categorical_count =len (self .current_data .select_dtypes (exclude ='number').columns )

        if numeric_count >0 :
            summary_parts .append (f"{numeric_count} numeric columns for quantitative analysis")
        if categorical_count >0 :
            summary_parts .append (f"{categorical_count} categorical columns for segmentation")

        missing_pct =(self .current_data .isnull ().sum ().sum ()/(self .current_data .shape [0 ]*self .current_data .shape [1 ]))*100
        if missing_pct >10 :
            summary_parts .append (f"⚠️ {missing_pct:.1f}% missing values detected")
        elif missing_pct >0 :
            summary_parts .append (f"✓ Good data quality ({missing_pct:.1f}% missing)")
        else :
            summary_parts .append ("✓ Complete dataset (no missing values)")

        return ". ".join (summary_parts )+"."

    def _get_missing_values_analysis (self )->Dict [str ,Any ]:
        """Analyze missing values in the dataset"""
        if self .current_data is None :
            return {}

        missing_data =self .current_data .isnull ().sum ()
        missing_percentage =(missing_data /len (self .current_data ))*100

        return {
        "missing_counts":missing_data .to_dict (),
        "missing_percentages":missing_percentage .to_dict (),
        "total_missing":int (missing_data .sum ()),
        "columns_with_missing":missing_data [missing_data >0 ].index .tolist (),
        "complete_rows":int (len (self .current_data )-self .current_data .isnull ().any (axis =1 ).sum ())
        }

    def _detect_outliers_comprehensive (self )->Dict [str ,Any ]:
        """Comprehensive outlier detection for all numeric columns"""
        if self .current_data is None :
            return {}

        numeric_cols =self .current_data .select_dtypes (include ='number').columns
        outlier_info ={}

        for col in numeric_cols :
            col_data =self .current_data [col ].dropna ()
            if len (col_data )<5 :
                continue

            Q1 =col_data .quantile (0.25 )
            Q3 =col_data .quantile (0.75 )
            IQR =Q3 -Q1
            lower_bound =Q1 -1.5 *IQR
            upper_bound =Q3 +1.5 *IQR

            outliers =col_data [(col_data <lower_bound )|(col_data >upper_bound )]

            outlier_info [col ]={
            "outlier_count":len (outliers ),
            "outlier_percentage":(len (outliers )/len (col_data ))*100 ,
            "lower_bound":lower_bound ,
            "upper_bound":upper_bound ,
            "outlier_values":outliers .tolist ()[:10 ]
            }

        return outlier_info

    def _generate_comprehensive_ai_insights (self )->Dict [str ,Any ]:
        """Generate high-level AI style insights summarizing dataset health, key stats and relationships.

        This is a lightweight, deterministic implementation (no external LLM calls) so backend
        routes relying on it do not fail. It leverages already computed metadata to assemble
        narrative + structured bullets. Cached by dataset hash for performance.
        """
        if self .current_data is None :
            return {"error":"No dataset loaded"}

        cache_key ='comprehensive'
        if cache_key in self .insights_cache :
            return self .insights_cache [cache_key ]

        info =self .data_info or self ._generate_data_info ()
        numeric_cols =info .get ('numeric_columns',[])
        categorical_cols =info .get ('categorical_columns',[])

        insights ={
        "dataset_shape":f"{info.get('total_rows', 0)} rows x {info.get('total_columns', 0)} columns",
        "data_quality_score":info .get ('data_quality',{}).get ('completeness_score'),
        "issues_summary":list (info .get ('data_quality',{}).get ('uniformity_issues',{}).keys ()),
        "top_numeric_volatility":self ._rank_numeric_by_std (numeric_cols )[:3 ],
        "strong_correlations":self ._get_correlation_highlights (),
        "recommended_next_steps":self ._get_recommended_next_steps (),
        "narrative":self ._compose_insights_narrative (info )
        }

        self .insights_cache [cache_key ]=insights
        return insights

    def _generate_ai_insights (self ,analysis_result :Dict [str ,Any ])->Dict [str ,Any ]:
        """Generate contextual AI style insight bullets for a single analysis result."""
        if not analysis_result :
            return {}
        bullets =[]
        atype =analysis_result .get ('analysis_type')
        if atype =='correlation':
            strong =analysis_result .get ('strong_correlations',[])
            if strong :
                bullets .append (f"Detected {len(strong)} strong relationships; highest |r| = {max(abs(c['correlation']) for c in strong):.2f}.")
        if atype =='distribution':
            stats =analysis_result .get ('statistics',{})
            if stats :
                skew =stats .get ('skewness')
                if skew is not None :
                    if abs (skew )<0.5 :
                        bullets .append ('Distribution is approximately symmetric.')
                    elif skew >0 :
                        bullets .append ('Distribution is right-skewed (tail to high values).')
                    else :
                        bullets .append ('Distribution is left-skewed (tail to low values).')
        if atype =='averages':
            results =analysis_result .get ('results',{})
            if results :
                top =sorted (results .items (),key =lambda x :x [1 ],reverse =True )[:1 ]
                if top :
                    bullets .append (f"Highest mean: {top[0][0]} = {top[0][1]:.2f}")
        if atype =='trend':
            slope =analysis_result .get ('slope')
            if slope is not None :
                bullets .append (f"Overall trend {analysis_result.get('trend_direction')} (slope {slope:.4f}).")
        if not bullets :
            bullets .append ('Analysis completed with no critical anomalies detected.')
        return {"analysis_type":atype ,"bullets":bullets }

    def _get_distribution_summary (self ,column :str )->Dict [str ,Any ]:
        if self .current_data is None or column not in self .current_data .columns :
            return {}
        series =self .current_data [column ].dropna ()
        if series .empty or series .dtype not in [np .float64 ,np .int64 ]:
            return {}
        return {
        "mean":float (series .mean ()),
        "std":float (series .std ()),
        "min":float (series .min ()),
        "max":float (series .max ()),
        "skew":float (series .skew ()),
        "kurtosis":float (series .kurtosis ())
        }

    def _get_specific_correlations (self ,columns :List [str ])->Dict [str ,Any ]:
        numeric_cols =[c for c in columns if c in self .current_data .select_dtypes (include ='number').columns ]
        if len (numeric_cols )<2 :
            return {"message":"Need at least two numeric columns"}
        corr =self .current_data [numeric_cols ].corr ()
        pairs =[]
        for i ,c1 in enumerate (numeric_cols ):
            for c2 in numeric_cols [i +1 :]:
                pairs .append ({"variable_1":c1 ,"variable_2":c2 ,"correlation":float (corr .loc [c1 ,c2 ])})
        return {"correlations":sorted (pairs ,key =lambda x :abs (x ['correlation']),reverse =True )}

    def _get_top_correlations (self )->Dict [str ,Any ]:
        numeric =self .current_data .select_dtypes (include ='number')
        if numeric .shape [1 ]<2 :
            return {"message":"Not enough numeric columns"}
        corr =numeric .corr ()
        pairs =[]
        cols =list (corr .columns )
        for i in range (len (cols )):
            for j in range (i +1 ,len (cols )):
                val =float (corr .iloc [i ,j ])
                pairs .append ({"variable_1":cols [i ],"variable_2":cols [j ],"correlation":val })
        pairs .sort (key =lambda x :abs (x ['correlation']),reverse =True )
        return {"correlations":pairs [:5 ]}

    def _get_missing_data_analysis (self )->Dict [str ,Any ]:
        if self .current_data is None :
            return {}
        miss =self .current_data .isnull ().sum ()
        total =int (miss .sum ())
        return {"total_missing":total ,"columns":miss [miss >0 ].to_dict ()}

    def _get_outlier_analysis (self )->Dict [str ,Any ]:
        numeric_cols =self .current_data .select_dtypes (include ='number').columns
        out ={}
        for col in numeric_cols :
            out [col ]=self ._detect_outliers_column (self .current_data [col ].dropna ())
        return out

    def _analyze_query_intent (self ,query :str )->Dict [str ,Any ]:
        q =query .lower ()
        intents =[]
        if any (k in q for k in ['trend','over time']):intents .append ('trend')
        if 'correl'in q :intents .append ('correlation')
        if any (k in q for k in ['average','mean','median']):intents .append ('statistics')
        if any (k in q for k in ['outlier','anomal','unusual']):intents .append ('anomaly')
        return {"intents":intents or ['general']}

    def _suggest_related_analyses (self ,query :str ,result :Dict [str ,Any ])->List [str ]:
        suggestions =[]
        intents =result .get ('query_context',{}).get ('intents',[])
        if 'correlation'in intents :
            suggestions .append ('Run a distribution analysis for correlated variables')
        if 'trend'in intents :
            suggestions .append ('Decompose time series to check seasonality')
        if 'statistics'in intents :
            suggestions .append ('Calculate variance and coefficient of variation for numeric columns')
        if 'anomaly'in intents :
            suggestions .append ('Cluster data points to isolate anomalous groups')
        if not suggestions :
            suggestions =['Generate dataset summary','View top correlations']
        return suggestions

    def _smart_correlation_analysis (self ,mentioned_columns :List [str ])->Optional [Dict [str ,Any ]]:
        numeric =self .current_data .select_dtypes (include ='number')
        if numeric .shape [1 ]<2 :
            return None
        target_cols =[c for c in mentioned_columns if c in numeric .columns ]or list (numeric .columns [:3 ])
        corr =numeric [target_cols ].corr ()
        strong =[]
        for i ,c1 in enumerate (target_cols ):
            for c2 in target_cols [i +1 :]:
                val =float (corr .loc [c1 ,c2 ])
                if abs (val )>0.4 :
                    strong .append ({'var1':c1 ,'var2':c2 ,'correlation':round (val ,3 )})
        return {
        'analysis_type':'correlation',
        'correlation_matrix':corr .to_dict (),
        'strong_correlations':strong ,
        'insights':f"Focused correlation scan across {len(target_cols)} variables"
        }

    def _temporal_analysis (self ,query :str ,mentioned_columns :List [str ])->Optional [Dict [str ,Any ]]:

        numeric =self .current_data .select_dtypes (include ='number')
        if numeric .empty :
            return None
        col =mentioned_columns [0 ]if mentioned_columns and mentioned_columns [0 ]in numeric .columns else numeric .columns [0 ]
        series =numeric [col ].dropna ()
        if len (series )<3 :
            return None
        x =np .arange (len (series ))
        slope =np .polyfit (x ,series ,1 )[0 ]
        return {
        'analysis_type':'trend',
        'slope':float (slope ),
        'trend_direction':'increasing'if slope >0 else 'decreasing',
        'insights':f"Temporal trend detected for {col}: slope {slope:.4f}"
        }

    def _categorical_breakdown (self ,mentioned_columns :List [str ])->Optional [Dict [str ,Any ]]:
        cats =self .current_data .select_dtypes (exclude ='number')
        if cats .empty :
            return None
        col =None
        for c in mentioned_columns :
            if c in cats .columns :
                col =c
                break
        col =col or cats .columns [0 ]
        counts =cats [col ].value_counts ().head (10 )
        return {
        'analysis_type':'categorical_breakdown',
        'column':col ,
        'top_categories':counts .to_dict (),
        'insights':f"Top category '{counts.index[0]}' represents {counts.iloc[0] / counts.sum() * 100:.1f}% of records"
        }

    def _detect_anomalies (self ,mentioned_columns :List [str ])->Optional [Dict [str ,Any ]]:
        numeric =self .current_data .select_dtypes (include ='number')
        if numeric .empty :
            return None
        col =mentioned_columns [0 ]if mentioned_columns and mentioned_columns [0 ]in numeric .columns else numeric .columns [0 ]
        series =numeric [col ].dropna ()
        if len (series )<5 :
            return None
        outinfo =self ._detect_outliers_column (series )
        return {
        'analysis_type':'anomaly_detection',
        'column':col ,
        'outlier_summary':{k :v for k ,v in outinfo .items ()if k !='outlier_values'},
        'insights':f"Detected {outinfo['outlier_count']} potential outliers ({outinfo['outlier_percentage']:.1f}% of observations) in {col}"
        }

    def _rank_numeric_by_std (self ,numeric_cols :List [str ])->List [Dict [str ,Any ]]:
        ranked =[]
        for c in numeric_cols :
            series =self .current_data [c ].dropna ()
            if len (series )>1 :
                ranked .append ({"column":c ,"std":float (series .std ()),"mean":float (series .mean ())})
        return sorted (ranked ,key =lambda x :x ['std'],reverse =True )

    def _get_correlation_highlights (self )->List [Dict [str ,Any ]]:
        numeric =self .current_data .select_dtypes (include ='number')
        if numeric .shape [1 ]<2 :
            return []
        corr =numeric .corr ()
        highlights =[]
        cols =list (corr .columns )
        for i in range (len (cols )):
            for j in range (i +1 ,len (cols )):
                val =float (corr .iloc [i ,j ])
                if abs (val )>=0.6 :
                    highlights .append ({"var1":cols [i ],"var2":cols [j ],"correlation":round (val ,3 )})
        return sorted (highlights ,key =lambda x :abs (x ['correlation']),reverse =True )[:5 ]

    def _get_recommended_next_steps (self )->List [str ]:
        steps =[]
        if self .data_info .get ('data_quality',{}).get ('duplicate_rows'):
            steps .append ('Remove duplicate rows')
        if self .data_info .get ('data_quality',{}).get ('columns_with_missing_data'):
            steps .append ('Impute or drop columns with high missing values')
        if not steps :
            steps =['Deep dive into correlation drivers','Segment analysis by key categorical variable']
        return steps

    def _compose_insights_narrative (self ,info :Dict [str ,Any ])->str :
        parts =[f"Dataset has {info.get('total_rows',0)} rows and {info.get('total_columns',0)} columns."]
        if info .get ('data_quality',{}).get ('completeness_score')is not None :
            parts .append (f"Completeness score {info['data_quality']['completeness_score']}%.")
        strong =self ._get_correlation_highlights ()
        if strong :
            top =strong [0 ]
            parts .append (f"Strongest observed correlation: {top['var1']} vs {top['var2']} (r={top['correlation']}).")
        issues =info .get ('data_quality',{}).get ('uniformity_issues',{})
        if issues :
            parts .append (f"Potential uniformity concerns in {len(issues)} columns.")
        return ' '.join (parts )
