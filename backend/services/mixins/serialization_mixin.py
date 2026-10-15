import math
import datetime
import numpy as np
import pandas as pd
from pandas import Timestamp

class SerializationMixin:
    def _json_safe(self, obj):
        """Recursively convert numpy/pandas types to native Python for valid JSON serialization."""
        if obj is None or obj is pd.NA:
            return None

        # Check for pandas/numpy NA or NaN first
        try:
            if pd.isna(obj):
                return None
        except Exception:
            pass

        if isinstance(obj, bool) or isinstance(obj, np.bool_):
            return bool(obj)

        if isinstance(obj, (int, np.integer)):
            return int(obj)

        if isinstance(obj, (float, np.floating)):
            if math.isnan(obj) or math.isinf(obj):
                return None
            return float(obj)

        if isinstance(obj, str):
            if '<StringDtype' in obj:
                return 'string'
            return obj

        if isinstance(obj, (Timestamp, datetime.datetime, datetime.date)):
            return obj.isoformat()

        if isinstance(obj, (pd.api.extensions.ExtensionDtype, np.dtype)):
            return 'string' if '<StringDtype' in str(obj) or isinstance(obj, pd.StringDtype) else str(obj)

        if isinstance(obj, dict):
            return {str(self._json_safe(k)): self._json_safe(v) for k, v in obj.items()}

        if isinstance(obj, (list, tuple, set, np.ndarray, pd.Series)):
            return [self._json_safe(v) for v in obj]

        if isinstance(obj, pd.DataFrame):
            return [self._json_safe(row) for row in obj.to_dict('records')]

        res_str = str(obj)
        if '<StringDtype' in res_str:
            return 'string'
        return res_str

