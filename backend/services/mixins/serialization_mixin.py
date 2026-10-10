import numpy as np
import pandas as pd
from pandas import Timestamp

class SerializationMixin :
    def _json_safe (self ,obj ):
        """Recursively convert numpy/pandas types to native Python for JSON serialization."""
        if isinstance (obj ,(str ,int ,float ,bool ))or obj is None :
            if isinstance (obj ,str )and '<StringDtype'in obj :
                return 'string'
            return obj
        if isinstance (obj ,(np .bool_ ,)):
            return bool (obj )
        if isinstance (obj ,(np .integer ,)):
            return int (obj )
        if isinstance (obj ,(np .floating ,)):
            return float (obj )
        if isinstance (obj ,Timestamp ):
            return obj .isoformat ()
        if isinstance (obj ,(pd .api .extensions .ExtensionDtype ,np .dtype )):
            return 'string'if '<StringDtype'in str (obj )or isinstance (obj ,pd .StringDtype )else str (obj )
        if isinstance (obj ,dict ):
            return {str (self ._json_safe (k )):self ._json_safe (v )for k ,v in obj .items ()}
        if isinstance (obj ,(list ,tuple ,set )):
            return [self ._json_safe (v )for v in obj ]
        try :
            if pd .isna (obj ):
                return None
        except Exception :
            pass
        res_str =str (obj )
        if '<StringDtype'in res_str :
            return 'string'
        return res_str
