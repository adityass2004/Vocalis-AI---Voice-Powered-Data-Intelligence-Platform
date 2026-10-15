import numpy as np
import pandas as pd

class StatsMixin :
    def _distribution_summary (self ,series :pd .Series ):
        series =series .dropna ()
        if series .empty :
            return {}
        return {
        'mean':float (series .mean ()),
        'std':float (series .std ()),
        'min':float (series .min ()),
        'max':float (series .max ()),
        'skew':float (series .skew ()),
        'kurtosis':float (series .kurtosis ())
        }
