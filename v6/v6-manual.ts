// Pine Script v6 Complete API Reference
// Generated: 2025-10-03T12:57:56.322Z
// Source: Manual extraction from TradingView documentation

export interface PineItem {
  description: string;
  syntax?: string;
  returns?: string;
  type?: string;
  category?: string;
  example?: string;
}

export const V6_VARIABLES: Record<string, PineItem> = {
  "close": {
    "description": "Close price of the current bar.",
    "type": "series float",
    "category": "price"
  },
  "open": {
    "description": "Open price of the current bar.",
    "type": "series float",
    "category": "price"
  },
  "high": {
    "description": "High price of the current bar.",
    "type": "series float",
    "category": "price"
  },
  "low": {
    "description": "Low price of the current bar.",
    "type": "series float",
    "category": "price"
  },
  "volume": {
    "description": "Volume of the current bar.",
    "type": "series float",
    "category": "volume"
  },
  "time": {
    "description": "Current bar time in UNIX format.",
    "type": "series int",
    "category": "time"
  },
  "bar_index": {
    "description": "Current bar number. First bar is 0.",
    "type": "series int",
    "category": "bar"
  },
  "last_bar_index": {
    "description": "Bar index of the last bar in the series.",
    "type": "series int",
    "category": "bar"
  },
  "last_bar_time": {
    "description": "Time of the last bar in UNIX format.",
    "type": "series int",
    "category": "time"
  },
  "hl2": {
    "description": "(high + low) / 2",
    "type": "series float",
    "category": "price"
  },
  "hlc3": {
    "description": "(high + low + close) / 3",
    "type": "series float",
    "category": "price"
  },
  "ohlc4": {
    "description": "(open + high + low + close) / 4",
    "type": "series float",
    "category": "price"
  },
  "hlcc4": {
    "description": "(high + low + close + close) / 4",
    "type": "series float",
    "category": "price"
  },
  "year": {
    "description": "Current bar year.",
    "type": "series int",
    "category": "time"
  },
  "month": {
    "description": "Current bar month (1-12).",
    "type": "series int",
    "category": "time"
  },
  "weekofyear": {
    "description": "Week number of the year.",
    "type": "series int",
    "category": "time"
  },
  "dayofmonth": {
    "description": "Day of month (1-31).",
    "type": "series int",
    "category": "time"
  },
  "dayofweek": {
    "description": "Day of week (1=Sunday, 7=Saturday).",
    "type": "series int",
    "category": "time"
  },
  "hour": {
    "description": "Current bar hour (0-23).",
    "type": "series int",
    "category": "time"
  },
  "minute": {
    "description": "Current bar minute (0-59).",
    "type": "series int",
    "category": "time"
  },
  "second": {
    "description": "Current bar second (0-59).",
    "type": "series int",
    "category": "time"
  },
  "na": {
    "description": "Not-a-number value. Represents undefined/missing values.",
    "type": "const float",
    "category": "special"
  },
  "timenow": {
    "description": "Current time in UNIX format (milliseconds).",
    "type": "simple int",
    "category": "time"
  },
  "ask": {
    "description": "Current ask price.",
    "type": "series float",
    "category": "price"
  },
  "bid": {
    "description": "Current bid price.",
    "type": "series float",
    "category": "price"
  },
  "barstate.isfirst": {
    "description": "True if current bar is the first bar in the series.",
    "type": "series bool",
    "category": "barstate"
  },
  "barstate.islast": {
    "description": "True if current bar is the last bar in the series.",
    "type": "series bool",
    "category": "barstate"
  },
  "barstate.ishistory": {
    "description": "True if current bar is a historical bar.",
    "type": "series bool",
    "category": "barstate"
  },
  "barstate.isrealtime": {
    "description": "True if current bar is a realtime bar.",
    "type": "series bool",
    "category": "barstate"
  },
  "barstate.isnew": {
    "description": "True if the script is executing on a new bar.",
    "type": "series bool",
    "category": "barstate"
  },
  "barstate.isconfirmed": {
    "description": "True if the current bar is confirmed (closed).",
    "type": "series bool",
    "category": "barstate"
  },
  "barstate.islastconfirmedhistory": {
    "description": "True if current bar is the last confirmed historical bar.",
    "type": "series bool",
    "category": "barstate"
  },
  "syminfo.ticker": {
    "description": "Symbol name without exchange prefix.",
    "type": "simple string",
    "category": "syminfo"
  },
  "syminfo.tickerid": {
    "description": "Full symbol ID including exchange prefix.",
    "type": "simple string",
    "category": "syminfo"
  },
  "syminfo.description": {
    "description": "Description of the current symbol.",
    "type": "simple string",
    "category": "syminfo"
  },
  "syminfo.type": {
    "description": "Type of the symbol (stock, futures, forex, crypto, etc).",
    "type": "simple string",
    "category": "syminfo"
  },
  "syminfo.currency": {
    "description": "Currency in which the symbol is traded.",
    "type": "simple string",
    "category": "syminfo"
  },
  "syminfo.basecurrency": {
    "description": "Base currency for crypto pairs.",
    "type": "simple string",
    "category": "syminfo"
  },
  "syminfo.root": {
    "description": "Root of the symbol name.",
    "type": "simple string",
    "category": "syminfo"
  },
  "syminfo.timezone": {
    "description": "Timezone of the symbol exchange.",
    "type": "simple string",
    "category": "syminfo"
  },
  "syminfo.session": {
    "description": "Session specification for the symbol.",
    "type": "simple string",
    "category": "syminfo"
  },
  "syminfo.mintick": {
    "description": "Minimum tick value for the symbol.",
    "type": "simple float",
    "category": "syminfo"
  },
  "syminfo.pointvalue": {
    "description": "Point value in account currency.",
    "type": "simple float",
    "category": "syminfo"
  },
  "timeframe.period": {
    "description": "Current timeframe period as a string.",
    "type": "simple string",
    "category": "timeframe"
  },
  "timeframe.multiplier": {
    "description": "Multiplier of the current timeframe.",
    "type": "simple int",
    "category": "timeframe"
  },
  "timeframe.isdaily": {
    "description": "True if current timeframe is daily or higher.",
    "type": "simple bool",
    "category": "timeframe"
  },
  "timeframe.isdwm": {
    "description": "True if timeframe is daily, weekly, or monthly.",
    "type": "simple bool",
    "category": "timeframe"
  },
  "timeframe.isintraday": {
    "description": "True if timeframe is intraday (less than daily).",
    "type": "simple bool",
    "category": "timeframe"
  },
  "timeframe.isminutes": {
    "description": "True if timeframe is in minutes.",
    "type": "simple bool",
    "category": "timeframe"
  },
  "timeframe.isseconds": {
    "description": "True if timeframe is in seconds.",
    "type": "simple bool",
    "category": "timeframe"
  },
  "timeframe.isweekly": {
    "description": "True if timeframe is weekly.",
    "type": "simple bool",
    "category": "timeframe"
  },
  "timeframe.ismonthly": {
    "description": "True if timeframe is monthly.",
    "type": "simple bool",
    "category": "timeframe"
  },
  "chart.bg_color": {
    "description": "Background color of the chart.",
    "type": "input color",
    "category": "chart"
  },
  "chart.fg_color": {
    "description": "Foreground color of the chart.",
    "type": "input color",
    "category": "chart"
  },
  "chart.is_standard": {
    "description": "True if chart type is standard (candles/bars).",
    "type": "simple bool",
    "category": "chart"
  },
  "chart.is_heikinashi": {
    "description": "True if chart type is Heikin Ashi.",
    "type": "simple bool",
    "category": "chart"
  },
  "chart.is_kagi": {
    "description": "True if chart type is Kagi.",
    "type": "simple bool",
    "category": "chart"
  },
  "chart.is_pnf": {
    "description": "True if chart type is Point & Figure.",
    "type": "simple bool",
    "category": "chart"
  },
  "chart.is_range": {
    "description": "True if chart type is Range.",
    "type": "simple bool",
    "category": "chart"
  },
  "chart.is_renko": {
    "description": "True if chart type is Renko.",
    "type": "simple bool",
    "category": "chart"
  },
  "chart.is_linebreak": {
    "description": "True if chart type is Line Break.",
    "type": "simple bool",
    "category": "chart"
  },
  "chart.left_visible_bar_time": {
    "description": "Time of leftmost visible bar.",
    "type": "input int",
    "category": "chart"
  },
  "chart.right_visible_bar_time": {
    "description": "Time of rightmost visible bar.",
    "type": "input int",
    "category": "chart"
  }
};

export const V6_FUNCTIONS: Record<string, PineItem> = {
  "indicator": {
    "description": "Declares an indicator script.",
    "syntax": "indicator(title, shorttitle=na, overlay=false, format=format.inherit, precision=na, scale=scale.right, max_bars_back=na, timeframe=na, timeframe_gaps=true, explicit_plot_zorder=false, max_lines_count=50, max_labels_count=50, max_boxes_count=50, max_polylines_count=50)",
    "returns": "void",
    "category": "declaration"
  },
  "strategy": {
    "description": "Declares a strategy script.",
    "syntax": "strategy(title, shorttitle, overlay, format, precision, scale, pyramiding, calc_on_order_fills, calc_on_every_tick, max_bars_back, backtest_fill_limits_assumption, default_qty_type, default_qty_value, initial_capital, currency, slippage, commission_type, commission_value, process_orders_on_close, close_entries_rule, margin_long, margin_short, explicit_plot_zorder, max_lines_count, max_labels_count, max_boxes_count, max_polylines_count, risk_free_rate, use_bar_magnifier, fill_orders_on_standard_ohlc)",
    "returns": "void",
    "category": "declaration"
  },
  "library": {
    "description": "Declares a library script.",
    "syntax": "library(title, overlay)",
    "returns": "void",
    "category": "declaration"
  },
  "plot": {
    "description": "Plots a series of data on the chart.",
    "syntax": "plot(series, title, color, linewidth, style, trackprice, histbase, offset, join, editable, show_last, display)",
    "returns": "plot",
    "category": "plot",
    "example": "plot(close, title=\"Close\", color=color.blue)"
  },
  "plotshape": {
    "description": "Plots visual shapes on the chart.",
    "syntax": "plotshape(series, title, style, location, color, offset, text, textcolor, editable, size, show_last, display)",
    "returns": "void",
    "category": "plot"
  },
  "plotchar": {
    "description": "Plots a character for each data point.",
    "syntax": "plotchar(series, title, char, location, color, offset, text, textcolor, editable, size, show_last, display)",
    "returns": "void",
    "category": "plot"
  },
  "plotarrow": {
    "description": "Plots up and down arrows based on series value.",
    "syntax": "plotarrow(series, title, colorup, colordown, offset, minheight, maxheight, editable, show_last, display)",
    "returns": "void",
    "category": "plot"
  },
  "plotbar": {
    "description": "Plots OHLC bars.",
    "syntax": "plotbar(open, high, low, close, title, color, editable, show_last, display)",
    "returns": "void",
    "category": "plot"
  },
  "plotcandle": {
    "description": "Plots candlesticks.",
    "syntax": "plotcandle(open, high, low, close, title, color, wickcolor, editable, show_last, bordercolor, display)",
    "returns": "void",
    "category": "plot"
  },
  "hline": {
    "description": "Renders a horizontal line at a given fixed price level.",
    "syntax": "hline(price, title, color, linestyle, linewidth, editable, display)",
    "returns": "hline",
    "category": "plot"
  },
  "fill": {
    "description": "Fills background between two plots or hlines.",
    "syntax": "fill(plot1, plot2, color, title, editable, show_last, fillgaps, display)",
    "returns": "void",
    "category": "plot"
  },
  "bgcolor": {
    "description": "Colors the chart background.",
    "syntax": "bgcolor(color, offset=0, editable=true, show_last=0, title=na, display=display.all, overlay=false)",
    "returns": "void",
    "category": "plot"
  },
  "alertcondition": {
    "description": "Creates an alert condition.",
    "syntax": "alertcondition(condition, title, message)",
    "returns": "void",
    "category": "alert"
  },
  "alert": {
    "description": "Triggers an alert event.",
    "syntax": "alert(message, freq)",
    "returns": "void",
    "category": "alert"
  }
};

export const V6_NAMESPACES: Record<string, any> = {
  "ta": {
    "description": "Technical Analysis functions",
    "functions": {
      "sma": {
        "description": "Simple Moving Average",
        "syntax": "ta.sma(source, length)",
        "returns": "series float"
      },
      "ema": {
        "description": "Exponential Moving Average",
        "syntax": "ta.ema(source, length)",
        "returns": "series float"
      },
      "wma": {
        "description": "Weighted Moving Average",
        "syntax": "ta.wma(source, length)",
        "returns": "series float"
      },
      "vwma": {
        "description": "Volume-Weighted Moving Average",
        "syntax": "ta.vwma(source, length)",
        "returns": "series float"
      },
      "rma": {
        "description": "Rolling Moving Average (Wilder's Smoothing)",
        "syntax": "ta.rma(source, length)",
        "returns": "series float"
      },
      "rsi": {
        "description": "Relative Strength Index",
        "syntax": "ta.rsi(source, length)",
        "returns": "series float"
      },
      "macd": {
        "description": "Moving Average Convergence/Divergence",
        "syntax": "ta.macd(source, fast, slow, signal)",
        "returns": "[series float, series float, series float]"
      },
      "cci": {
        "description": "Commodity Channel Index",
        "syntax": "ta.cci(source, length)",
        "returns": "series float"
      },
      "mfi": {
        "description": "Money Flow Index",
        "syntax": "ta.mfi(series, length)",
        "returns": "series float"
      },
      "bb": {
        "description": "Bollinger Bands",
        "syntax": "ta.bb(source, length, mult)",
        "returns": "[series float, series float, series float]"
      },
      "bbw": {
        "description": "Bollinger Bands Width",
        "syntax": "ta.bbw(source, length, mult)",
        "returns": "series float"
      },
      "kc": {
        "description": "Keltner Channels",
        "syntax": "ta.kc(source, length, mult, useTrueRange)",
        "returns": "[series float, series float, series float]"
      },
      "kcw": {
        "description": "Keltner Channels Width",
        "syntax": "ta.kcw(source, length, mult, useTrueRange)",
        "returns": "series float"
      },
      "stoch": {
        "description": "Stochastic",
        "syntax": "ta.stoch(source, high, low, length)",
        "returns": "series float"
      },
      "atr": {
        "description": "Average True Range",
        "syntax": "ta.atr(length)",
        "returns": "series float"
      },
      "tr": {
        "description": "True Range with optional parameters",
        "syntax": "ta.tr(handle_na)",
        "returns": "series float"
      },
      "highest": {
        "description": "Highest value over a period",
        "syntax": "ta.highest(source, length)",
        "returns": "series float"
      },
      "lowest": {
        "description": "Lowest value over a period",
        "syntax": "ta.lowest(source, length)",
        "returns": "series float"
      },
      "highestbars": {
        "description": "Offset to highest value",
        "syntax": "ta.highestbars(source, length)",
        "returns": "series int"
      },
      "lowestbars": {
        "description": "Offset to lowest value",
        "syntax": "ta.lowestbars(source, length)",
        "returns": "series int"
      },
      "valuewhen": {
        "description": "Value when condition was true",
        "syntax": "ta.valuewhen(condition, source, occurrence)",
        "returns": "series float"
      },
      "barssince": {
        "description": "Bars since condition was true",
        "syntax": "ta.barssince(condition)",
        "returns": "series int"
      },
      "change": {
        "description": "Difference between current and previous value",
        "syntax": "ta.change(source, length)",
        "returns": "series float"
      },
      "mom": {
        "description": "Momentum",
        "syntax": "ta.mom(source, length)",
        "returns": "series float"
      },
      "roc": {
        "description": "Rate of Change",
        "syntax": "ta.roc(source, length)",
        "returns": "series float"
      },
      "cross": {
        "description": "True when source1 crosses source2",
        "syntax": "ta.cross(source1, source2)",
        "returns": "series bool"
      },
      "crossover": {
        "description": "True when source1 crosses over source2",
        "syntax": "ta.crossover(source1, source2)",
        "returns": "series bool"
      },
      "crossunder": {
        "description": "True when source1 crosses under source2",
        "syntax": "ta.crossunder(source1, source2)",
        "returns": "series bool"
      },
      "pivothigh": {
        "description": "Pivot high",
        "syntax": "ta.pivothigh(source?, leftbars, rightbars)",
        "returns": "series float"
      },
      "pivotlow": {
        "description": "Pivot low",
        "syntax": "ta.pivotlow(source?, leftbars, rightbars)",
        "returns": "series float"
      },
      "vwap": {
        "description": "Volume-Weighted Average Price",
        "syntax": "ta.vwap(source)",
        "returns": "series float"
      },
      "sar": {
        "description": "Parabolic SAR",
        "syntax": "ta.sar(start, inc, max)",
        "returns": "series float"
      },
      "supertrend": {
        "description": "SuperTrend indicator",
        "syntax": "ta.supertrend(factor, atrPeriod)",
        "returns": "[series float, series int]"
      },
      "alma": {
        "description": "Arnaud Legoux Moving Average",
        "syntax": "ta.alma(series, length, offset, sigma)",
        "returns": "series float"
      },
      "swma": {
        "description": "Symmetrically Weighted Moving Average",
        "syntax": "ta.swma(source)",
        "returns": "series float"
      },
      "linreg": {
        "description": "Linear Regression",
        "syntax": "ta.linreg(source, length, offset)",
        "returns": "series float"
      },
      "median": {
        "description": "Median",
        "syntax": "ta.median(source, length)",
        "returns": "series float"
      },
      "mode": {
        "description": "Mode (most common value)",
        "syntax": "ta.mode(source, length)",
        "returns": "series float"
      },
      "percentile_linear_interpolation": {
        "description": "Percentile with linear interpolation",
        "syntax": "ta.percentile_linear_interpolation(source, length, percentage)",
        "returns": "series float"
      },
      "percentile_nearest_rank": {
        "description": "Percentile using nearest rank",
        "syntax": "ta.percentile_nearest_rank(source, length, percentage)",
        "returns": "series float"
      },
      "percentrank": {
        "description": "Percent rank",
        "syntax": "ta.percentrank(source, length)",
        "returns": "series float"
      },
      "cum": {
        "description": "Cumulative sum",
        "syntax": "ta.cum(source)",
        "returns": "series float"
      },
      "dev": {
        "description": "Standard deviation",
        "syntax": "ta.dev(source, length)",
        "returns": "series float"
      },
      "stdev": {
        "description": "Standard deviation (alias for dev)",
        "syntax": "ta.stdev(source, length)",
        "returns": "series float"
      },
      "variance": {
        "description": "Variance",
        "syntax": "ta.variance(source, length)",
        "returns": "series float"
      },
      "correlation": {
        "description": "Correlation coefficient",
        "syntax": "ta.correlation(source1, source2, length)",
        "returns": "series float"
      },
      "cog": {
        "description": "Center of Gravity",
        "syntax": "ta.cog(source, length)",
        "returns": "series float"
      },
      "falling": {
        "description": "True if source is falling",
        "syntax": "ta.falling(source, length)",
        "returns": "series bool"
      },
      "rising": {
        "description": "True if source is rising",
        "syntax": "ta.rising(source, length)",
        "returns": "series bool"
      },
      "pivot_point_levels": {
        "description": "Pivot point levels",
        "syntax": "ta.pivot_point_levels(type, anchor, developing)",
        "returns": "array"
      }
    }
  },
  "math": {
    "description": "Mathematical functions",
    "functions": {
      "abs": {
        "description": "Absolute value",
        "syntax": "math.abs(number)",
        "returns": "float"
      },
      "acos": {
        "description": "Arc cosine",
        "syntax": "math.acos(number)",
        "returns": "float"
      },
      "asin": {
        "description": "Arc sine",
        "syntax": "math.asin(number)",
        "returns": "float"
      },
      "atan": {
        "description": "Arc tangent",
        "syntax": "math.atan(number)",
        "returns": "float"
      },
      "avg": {
        "description": "Average of arguments",
        "syntax": "math.avg(number1, number2, ...)",
        "returns": "float"
      },
      "ceil": {
        "description": "Round up to integer",
        "syntax": "math.ceil(number)",
        "returns": "int"
      },
      "cos": {
        "description": "Cosine",
        "syntax": "math.cos(number)",
        "returns": "float"
      },
      "exp": {
        "description": "e raised to power",
        "syntax": "math.exp(number)",
        "returns": "float"
      },
      "floor": {
        "description": "Round down to integer",
        "syntax": "math.floor(number)",
        "returns": "int"
      },
      "log": {
        "description": "Natural logarithm",
        "syntax": "math.log(number)",
        "returns": "float"
      },
      "log10": {
        "description": "Base-10 logarithm",
        "syntax": "math.log10(number)",
        "returns": "float"
      },
      "max": {
        "description": "Maximum value",
        "syntax": "math.max(number1, number2, ...)",
        "returns": "float"
      },
      "min": {
        "description": "Minimum value",
        "syntax": "math.min(number1, number2, ...)",
        "returns": "float"
      },
      "pow": {
        "description": "Power",
        "syntax": "math.pow(base, exponent)",
        "returns": "float"
      },
      "random": {
        "description": "Random number",
        "syntax": "math.random(min, max, seed)",
        "returns": "float"
      },
      "round": {
        "description": "Round to precision",
        "syntax": "math.round(number, precision)",
        "returns": "float"
      },
      "round_to_mintick": {
        "description": "Round to mintick",
        "syntax": "math.round_to_mintick(number)",
        "returns": "float"
      },
      "sign": {
        "description": "Sign of number (-1, 0, or 1)",
        "syntax": "math.sign(number)",
        "returns": "int"
      },
      "sin": {
        "description": "Sine",
        "syntax": "math.sin(number)",
        "returns": "float"
      },
      "sqrt": {
        "description": "Square root",
        "syntax": "math.sqrt(number)",
        "returns": "float"
      },
      "sum": {
        "description": "Sum of values",
        "syntax": "math.sum(source, length)",
        "returns": "series float"
      },
      "tan": {
        "description": "Tangent",
        "syntax": "math.tan(number)",
        "returns": "float"
      },
      "todegrees": {
        "description": "Convert radians to degrees",
        "syntax": "math.todegrees(radians)",
        "returns": "float"
      },
      "toradians": {
        "description": "Convert degrees to radians",
        "syntax": "math.toradians(degrees)",
        "returns": "float"
      }
    }
  },
  "input": {
    "description": "Input functions for user parameters",
    "functions": {
      "int": {
        "description": "Integer input",
        "syntax": "input.int(defval, title, minval, maxval, step, tooltip, inline, group, confirm)",
        "returns": "input int"
      },
      "float": {
        "description": "Float input",
        "syntax": "input.float(defval, title, minval, maxval, step, tooltip, inline, group, confirm)",
        "returns": "input float"
      },
      "bool": {
        "description": "Boolean input",
        "syntax": "input.bool(defval, title, tooltip, inline, group, confirm)",
        "returns": "input bool"
      },
      "string": {
        "description": "String input",
        "syntax": "input.string(defval, title, options, tooltip, inline, group, confirm)",
        "returns": "input string"
      },
      "timeframe": {
        "description": "Timeframe input",
        "syntax": "input.timeframe(defval, title, options, tooltip, inline, group, confirm)",
        "returns": "input string"
      },
      "symbol": {
        "description": "Symbol input",
        "syntax": "input.symbol(defval, title, tooltip, inline, group, confirm)",
        "returns": "input string"
      },
      "session": {
        "description": "Session input",
        "syntax": "input.session(defval, title, options, tooltip, inline, group, confirm)",
        "returns": "input string"
      },
      "source": {
        "description": "Source input (price data)",
        "syntax": "input.source(defval, title, tooltip, inline, group)",
        "returns": "series float"
      },
      "color": {
        "description": "Color input",
        "syntax": "input.color(defval, title, tooltip, inline, group)",
        "returns": "input color"
      },
      "price": {
        "description": "Price input",
        "syntax": "input.price(defval, title, tooltip, inline, group, confirm)",
        "returns": "input float"
      },
      "time": {
        "description": "Time input",
        "syntax": "input.time(defval, title, tooltip, inline, group, confirm)",
        "returns": "input int"
      },
      "text_area": {
        "description": "Multi-line text input",
        "syntax": "input.text_area(defval, title, tooltip, group, confirm)",
        "returns": "input string"
      }
    }
  },
  "request": {
    "description": "Data request functions",
    "functions": {
      "security": {
        "description": "Request data from another symbol/timeframe",
        "syntax": "request.security(symbol, timeframe, expression, gaps, lookahead, ignore_invalid_symbol, currency, calc_bars_count)",
        "returns": "series"
      },
      "security_lower_tf": {
        "description": "Request data from lower timeframe",
        "syntax": "request.security_lower_tf(symbol, timeframe, expression, ignore_invalid_symbol, currency, ignore_invalid_timeframe, calc_bars_count)",
        "returns": "array"
      },
      "dividends": {
        "description": "Request dividend data",
        "syntax": "request.dividends(ticker, field, gaps, lookahead, ignore_invalid_symbol, currency)",
        "returns": "series float"
      },
      "splits": {
        "description": "Request split data",
        "syntax": "request.splits(ticker, field, gaps, lookahead, ignore_invalid_symbol)",
        "returns": "series float"
      },
      "earnings": {
        "description": "Request earnings data",
        "syntax": "request.earnings(ticker, field, gaps, lookahead, ignore_invalid_symbol, currency)",
        "returns": "series float"
      },
      "quandl": {
        "description": "Request Quandl data",
        "syntax": "request.quandl(ticker, gaps, index, ignore_invalid_symbol)",
        "returns": "series float"
      },
      "financial": {
        "description": "Request financial data",
        "syntax": "request.financial(symbol, field, period, gaps, ignore_invalid_symbol, currency)",
        "returns": "series float"
      },
      "economic": {
        "description": "Request economic data",
        "syntax": "request.economic(country_code, field, gaps, ignore_invalid_symbol)",
        "returns": "series float"
      },
      "seed": {
        "description": "Request seed data",
        "syntax": "request.seed(source, symbol, expression)",
        "returns": "series"
      }
    }
  },
  "str": {
    "description": "String manipulation functions",
    "functions": {
      "contains": {
        "description": "Check if string contains substring",
        "syntax": "str.contains(source, str)",
        "returns": "bool"
      },
      "endswith": {
        "description": "Check if string ends with substring",
        "syntax": "str.endswith(source, str)",
        "returns": "bool"
      },
      "startswith": {
        "description": "Check if string starts with substring",
        "syntax": "str.startswith(source, str)",
        "returns": "bool"
      },
      "format": {
        "description": "Format string with placeholders",
        "syntax": "str.format(formatString, arg1, arg2, ...)",
        "returns": "string"
      },
      "length": {
        "description": "String length",
        "syntax": "str.length(string)",
        "returns": "int"
      },
      "lower": {
        "description": "Convert to lowercase",
        "syntax": "str.lower(source)",
        "returns": "string"
      },
      "upper": {
        "description": "Convert to uppercase",
        "syntax": "str.upper(source)",
        "returns": "string"
      },
      "match": {
        "description": "Match regular expression",
        "syntax": "str.match(source, regex)",
        "returns": "bool"
      },
      "pos": {
        "description": "Find substring position",
        "syntax": "str.pos(source, str)",
        "returns": "int"
      },
      "replace": {
        "description": "Replace substring",
        "syntax": "str.replace(source, target, replacement, occurrence)",
        "returns": "string"
      },
      "replace_all": {
        "description": "Replace all occurrences",
        "syntax": "str.replace_all(source, target, replacement)",
        "returns": "string"
      },
      "split": {
        "description": "Split string",
        "syntax": "str.split(string, separator)",
        "returns": "array<string>"
      },
      "substring": {
        "description": "Extract substring",
        "syntax": "str.substring(source, begin_pos, end_pos)",
        "returns": "string"
      },
      "tonumber": {
        "description": "Convert string to number",
        "syntax": "str.tonumber(string)",
        "returns": "float"
      },
      "tostring": {
        "description": "Convert to string",
        "syntax": "str.tostring(value, format)",
        "returns": "string"
      }
    }
  },
  "color": {
    "description": "Color functions and constants",
    "functions": {
      "new": {
        "description": "Create new color with transparency",
        "syntax": "color.new(color, transp)",
        "returns": "color"
      },
      "rgb": {
        "description": "Create color from RGB",
        "syntax": "color.rgb(red, green, blue, transp)",
        "returns": "color"
      },
      "from_gradient": {
        "description": "Color gradient",
        "syntax": "color.from_gradient(value, bottom_value, top_value, bottom_color, top_color)",
        "returns": "color"
      },
      "r": {
        "description": "Get red component",
        "syntax": "color.r(color)",
        "returns": "float"
      },
      "g": {
        "description": "Get green component",
        "syntax": "color.g(color)",
        "returns": "float"
      },
      "b": {
        "description": "Get blue component",
        "syntax": "color.b(color)",
        "returns": "float"
      },
      "t": {
        "description": "Get transparency",
        "syntax": "color.t(color)",
        "returns": "float"
      }
    },
    "constants": {
      "red": "#FF0000",
      "green": "#00FF00",
      "blue": "#0000FF",
      "yellow": "#FFFF00",
      "white": "#FFFFFF",
      "black": "#000000",
      "orange": "#FF8000",
      "aqua": "#00FFFF",
      "fuchsia": "#FF00FF",
      "gray": "#808080",
      "lime": "#00FF00",
      "maroon": "#800000",
      "navy": "#000080",
      "olive": "#808000",
      "purple": "#800080",
      "silver": "#C0C0C0",
      "teal": "#008080"
    }
  },
  "array": {
    "description": "Array manipulation functions",
    "functions": {
      "new": {
        "description": "Create new array",
        "syntax": "array.new<type>(size, initial_value)",
        "returns": "array"
      },
      "new_int": {
        "description": "Create new int array",
        "syntax": "array.new_int(size, initial_value)",
        "returns": "array<int>"
      },
      "new_float": {
        "description": "Create new float array",
        "syntax": "array.new_float(size, initial_value)",
        "returns": "array<float>"
      },
      "new_bool": {
        "description": "Create new bool array",
        "syntax": "array.new_bool(size, initial_value)",
        "returns": "array<bool>"
      },
      "new_color": {
        "description": "Create new color array",
        "syntax": "array.new_color(size, initial_value)",
        "returns": "array<color>"
      },
      "new_string": {
        "description": "Create new string array",
        "syntax": "array.new_string(size, initial_value)",
        "returns": "array<string>"
      },
      "new_line": {
        "description": "Create new line array",
        "syntax": "array.new_line(size, initial_value)",
        "returns": "array<line>"
      },
      "new_label": {
        "description": "Create new label array",
        "syntax": "array.new_label(size, initial_value)",
        "returns": "array<label>"
      },
      "new_box": {
        "description": "Create new box array",
        "syntax": "array.new_box(size, initial_value)",
        "returns": "array<box>"
      },
      "new_table": {
        "description": "Create new table array",
        "syntax": "array.new_table(size, initial_value)",
        "returns": "array<table>"
      },
      "from": {
        "description": "Create array from values",
        "syntax": "array.from(arg1, arg2, ...)",
        "returns": "array"
      },
      "push": {
        "description": "Add element to end",
        "syntax": "array.push(id, value)",
        "returns": "void"
      },
      "pop": {
        "description": "Remove and return last element",
        "syntax": "array.pop(id)",
        "returns": "type"
      },
      "unshift": {
        "description": "Add element to beginning",
        "syntax": "array.unshift(id, value)",
        "returns": "void"
      },
      "shift": {
        "description": "Remove and return first element",
        "syntax": "array.shift(id)",
        "returns": "type"
      },
      "get": {
        "description": "Get element at index",
        "syntax": "array.get(id, index)",
        "returns": "type"
      },
      "set": {
        "description": "Set element at index",
        "syntax": "array.set(id, index, value)",
        "returns": "void"
      },
      "size": {
        "description": "Get array size",
        "syntax": "array.size(id)",
        "returns": "int"
      },
      "clear": {
        "description": "Remove all elements",
        "syntax": "array.clear(id)",
        "returns": "void"
      },
      "concat": {
        "description": "Concatenate arrays",
        "syntax": "array.concat(id1, id2)",
        "returns": "void"
      },
      "copy": {
        "description": "Copy array",
        "syntax": "array.copy(id)",
        "returns": "array"
      },
      "includes": {
        "description": "Check if array includes value",
        "syntax": "array.includes(id, value)",
        "returns": "bool"
      },
      "indexof": {
        "description": "Find index of value",
        "syntax": "array.indexof(id, value)",
        "returns": "int"
      },
      "insert": {
        "description": "Insert element at index",
        "syntax": "array.insert(id, index, value)",
        "returns": "void"
      },
      "join": {
        "description": "Join array elements into string",
        "syntax": "array.join(id, separator)",
        "returns": "string"
      },
      "lastindexof": {
        "description": "Find last index of value",
        "syntax": "array.lastindexof(id, value)",
        "returns": "int"
      },
      "remove": {
        "description": "Remove element at index",
        "syntax": "array.remove(id, index)",
        "returns": "type"
      },
      "reverse": {
        "description": "Reverse array",
        "syntax": "array.reverse(id)",
        "returns": "void"
      },
      "slice": {
        "description": "Extract slice of array",
        "syntax": "array.slice(id, index_from, index_to)",
        "returns": "array"
      },
      "sort": {
        "description": "Sort array",
        "syntax": "array.sort(id, order)",
        "returns": "void"
      },
      "sum": {
        "description": "Sum of array elements",
        "syntax": "array.sum(id)",
        "returns": "float"
      },
      "min": {
        "description": "Minimum value",
        "syntax": "array.min(id)",
        "returns": "float"
      },
      "max": {
        "description": "Maximum value",
        "syntax": "array.max(id)",
        "returns": "float"
      },
      "avg": {
        "description": "Average value",
        "syntax": "array.avg(id)",
        "returns": "float"
      },
      "median": {
        "description": "Median value",
        "syntax": "array.median(id)",
        "returns": "float"
      },
      "mode": {
        "description": "Mode (most common value)",
        "syntax": "array.mode(id)",
        "returns": "float"
      },
      "variance": {
        "description": "Variance",
        "syntax": "array.variance(id)",
        "returns": "float"
      },
      "stdev": {
        "description": "Standard deviation",
        "syntax": "array.stdev(id)",
        "returns": "float"
      },
      "covariance": {
        "description": "Covariance",
        "syntax": "array.covariance(id1, id2)",
        "returns": "float"
      },
      "range": {
        "description": "Range (max - min)",
        "syntax": "array.range(id)",
        "returns": "float"
      },
      "fill": {
        "description": "Fill array with value",
        "syntax": "array.fill(id, value, index_from, index_to)",
        "returns": "void"
      }
    }
  },
  "strategy": {
    "description": "Strategy execution functions",
    "functions": {
      "entry": {
        "description": "Generate entry order",
        "syntax": "strategy.entry(id, direction, qty, limit, stop, oca_name, oca_type, comment, when, alert_message)",
        "returns": "void"
      },
      "close": {
        "description": "Close position",
        "syntax": "strategy.close(id, when, comment, qty, qty_percent, alert_message, immediately)",
        "returns": "void"
      },
      "close_all": {
        "description": "Close all positions",
        "syntax": "strategy.close_all(when, comment, alert_message, immediately)",
        "returns": "void"
      },
      "exit": {
        "description": "Generate exit order",
        "syntax": "strategy.exit(id, from_entry, qty, qty_percent, profit, limit, loss, stop, trail_price, trail_points, trail_offset, oca_name, comment, when, alert_message)",
        "returns": "void"
      },
      "order": {
        "description": "Generate custom order",
        "syntax": "strategy.order(id, direction, qty, limit, stop, oca_name, oca_type, comment, when, alert_message)",
        "returns": "void"
      },
      "cancel": {
        "description": "Cancel pending orders",
        "syntax": "strategy.cancel(id, when)",
        "returns": "void"
      },
      "cancel_all": {
        "description": "Cancel all pending orders",
        "syntax": "strategy.cancel_all(when)",
        "returns": "void"
      },
      "risk": {
        "description": "Manage risk",
        "syntax": "strategy.risk.allow_entry_in(direction)",
        "returns": "void"
      }
    },
    "variables": {
      "position_size": {
        "description": "Current position size",
        "type": "series float"
      },
      "position_avg_price": {
        "description": "Average entry price",
        "type": "series float"
      },
      "equity": {
        "description": "Current equity",
        "type": "series float"
      },
      "netprofit": {
        "description": "Net profit",
        "type": "series float"
      },
      "openprofit": {
        "description": "Open profit",
        "type": "series float"
      },
      "wintrades": {
        "description": "Number of winning trades",
        "type": "series int"
      },
      "losstrades": {
        "description": "Number of losing trades",
        "type": "series int"
      },
      "closedtrades": {
        "description": "Total closed trades",
        "type": "series int"
      }
    }
  }
};

// Helper to get all completion items
export function getAllCompletionItems(): { variables: Record<string, PineItem>, functions: Record<string, PineItem> } {
  const allVars = { ...V6_VARIABLES };
  const allFuncs = { ...V6_FUNCTIONS };
  
  // Add namespace functions
  Object.entries(V6_NAMESPACES).forEach(([ns, data]: [string, any]) => {
    if (data.functions) {
      Object.entries(data.functions).forEach(([name, item]) => {
        allFuncs[`${ns}.${name}`] = item as PineItem;
      });
    }
    if (data.variables) {
      Object.entries(data.variables).forEach(([name, item]) => {
        allVars[`${ns}.${name}`] = item as PineItem;
      });
    }
  });
  
  return { variables: allVars, functions: allFuncs };
}
