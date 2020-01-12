import React from 'react'
import PropTypes from 'prop-types'
import clsx from 'clsx';
import { fade, withStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import UnfoldLess from '@material-ui/icons/UnfoldLess';
import UnfoldMore from '@material-ui/icons/UnfoldMore';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, ReferenceArea, CartesianGrid, XAxis, YAxis, Tooltip, Text, Legend } from 'recharts';
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const styles = (theme) => ({
  root: {},
  header: {
    position: 'static',
    width: '100%',
    display: 'flex',
    zIndex: 1100,
    boxSizing: 'border-box',
    flexShrink: 0,
    flexDirection: 'column',
    padding: theme.spacing(1, 2),
    background: '#f7f7f7',
  },
  headerInside: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  toggleReferenceArea: {
    marginLeft: 'auto',
  },
  content: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  },
  referenceArea: {
    opacity: '0.8',
  },
  legend: {
    padding: 0,
    marginTop: '6px',
    marginBottom: 0,
    textAlign: 'center',
    color: '#212121',
    fontSize: '14px',
    '& li': {
      display: 'inline-block',
      marginRight: 10,
    },
    '& .colorBox': {
      width: 10,
      height: 10,
      border: '1px #aaa solid',
      display: 'inline-block',
      marginRight: 2,
    }
  },
  tooltip: {
    border: '1px rgba(0, 0, 0, 0.35) solid',
    background: 'rgba(255, 255, 255, 0.96)',
    fontSize: '14px',
    padding: theme.spacing(0.5),
    '&$normal': {
      
    },
    '&$abnormal': {
      border: '1px rgba(200, 0, 0, 0.35) solid',
      background: 'rgba(255, 235, 235, 0.96)',
    },
    '& .date': {
      fontWeight: 'bold',
    },
    '& .alert': {
      color: 'red',
    },
    '& p': {
      margin: 0,
    }
  },
  normal: {},
  abnormal: {},
})

const colorMap = {
  "Available": "#88ff88",
  "PendingBusy": "#fff8a2",
  "Busy": "#ffcc88",
  "AfterCallWork": "#888888",
  "FailedConnectAgent": "#ff8488",
  "FailedConnectCustomer": "#ff8488",
  "CallingCustomer": "#fff8a2",
  "MissedCallAgent": "#bbbbff",
  "__custom": "#ffffff",
}

class MetricsView extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = this._getInitialState()
    this.handleToggleReferenceArea = this.handleToggleReferenceArea.bind(this)
    this.handleLegendMouseEnter = this.handleLegendMouseEnter.bind(this)
    this.handleLegendMouseLeave = this.handleLegendMouseLeave.bind(this)
    this.renderCustomAxisTick = this.renderCustomAxisTick.bind(this)
    this.renderCustomTooltip = this.renderCustomTooltip.bind(this)
    this.renderCustomLegend = this.renderCustomLegend.bind(this)
  }
  
  _getInitialState() {
    return {
      skewThreshold: 10000,
      hideReferenceArea: false,
      referenceAreaOpacities: Object.fromEntries(Object.keys(colorMap).map(name => [name, 1])),
    }
  }
  
  handleToggleReferenceArea() {
    const { hideReferenceArea } = this.state
    this.setState({ hideReferenceArea: !hideReferenceArea })
  }
  
  handleLegendMouseEnter(name) {
    const { referenceAreaOpacities: opacities } = this.state
    const newOpacities = Object.fromEntries(Object.keys(opacities).map(name => [name, 0.25]))
  	this.setState({
  	  referenceAreaOpacities: { ...newOpacities, [name]: 1 }
  	})
  }
  
  handleLegendMouseLeave(name) {
    const { referenceAreaOpacities: opacities } = this.state
    const newOpacities = Object.fromEntries(Object.keys(opacities).map(name => [name, 1.0]))
  	this.setState({
  	  referenceAreaOpacities: { ...newOpacities }
  	})
  }
  
  renderCustomAxisTick({ x, y, width, height, payload }) {
    return (
        <text x={x-35} y={y+15} >{dayjs(payload.value).utc().format('HH:mm:ss')}</text>
    )
  }
  
  renderCustomTooltip({ payload, label, active }) {
    const { classes } = this.props
    const { skewThreshold } = this.state
    if (active) {
      const skewTooLarge = Math.abs(payload[0].payload.skew) >= skewThreshold
      return (
          <div className={clsx(classes.tooltip, {
            [classes.normal]: !skewTooLarge,
            [classes.abnormal]: skewTooLarge,
          })}>
            <p className="date">{dayjs(payload[0].payload._snapshotTimestamp).toISOString()}</p>
            <p className="state">{payload[0].payload.state.name}</p>
            <p className="label">
              skew : {payload[0].payload.skew} ms
              { skewTooLarge && <span className="alert">&nbsp;(Too large!)</span> }
            </p>
          </div>
      )
    }
    return null
  }
  
  renderCustomLegend() {
    const { classes } = this.props
    const { referenceAreaOpacities } = this.state
    return (
      <ul className={classes.legend}>
        { Object.keys(colorMap).map((name) => (
            <li
              key={name} 
              onMouseEnter={() => this.handleLegendMouseEnter(name)}
              onMouseLeave={() => this.handleLegendMouseLeave(name)}
              style={{ opacity: referenceAreaOpacities[name] }}>
              <a className="colorBox" style={{ backgroundColor: colorMap[name]}} />
              { (name === '__custom') ? "Custom State" : name }
            </li>
        ))}
      </ul>
    )
  }
  
  render() {
    const { classes, className: classNameProp, log } = this.props
    const { skewThreshold, hideReferenceArea, referenceAreaOpacities } = this.state
    
    const snapshots = log
      .filter((event) => (event.text === "GET_AGENT_SNAPSHOT succeeded."))
      .flatMap((event) => {
        return event.objects.map((object, idx) => {
          return {
            ...object.snapshot,
            _event: event,
            _key: `${event._key}-${idx}`,
            _date: object.snapshot.snapshotTimestamp.substring(0, 10),
            _time: object.snapshot.snapshotTimestamp.substring(11, 23),
            _timezone: object.snapshot.snapshotTimestamp.substring(23),
            _snapshotTimestamp: dayjs(object.snapshot.snapshotTimestamp).valueOf(),
          }
        })
      })
      .map((snapshot, idx, arr) => {
        let eventKeyFrom = snapshot._event._key
        let eventKeyTo = (idx != arr.length - 1) ? arr[idx + 1]._event._key : log[log.length - 1]._key
        return {
          ...snapshot,
          _targetEventKeys: Array.from(Array(eventKeyTo - eventKeyFrom), (v, k) => (k + eventKeyFrom))
        }
      })
    
    const seqSnapshots = snapshots
      .reduce((acc, x) => {
        if (acc.length > 0 && acc[acc.length-1][0].state.name === x.state.name) {
          acc[acc.length-1].push(x)
        } else {
          acc.push([x])
        }
        return acc
      }, [])

    
    const gradientOffset = () => {
      const dataMax = Math.max(...snapshots.map((s) => s.skew));
      const dataMin = Math.min(...snapshots.map((s) => s.skew));
      
      const y0 = Math.min(1, Math.max(0, ( skewThreshold - dataMin) / (dataMax - dataMin)))
      const y1 = Math.min(1, Math.max(0, (-skewThreshold - dataMin) / (dataMax - dataMin)))
    
      return [
        1 - y0,
        1 - y1
      ]
    }
    const off = gradientOffset()
      
    return (
      <div className="LogView" className={clsx(classes.root, classNameProp)}>
        <Paper>
          <div className={classes.header}>
            <div className={classes.headerInside}>
              <Typography className={classes.title} variant="h6" component="h3">
                Metrics
              </Typography>
              { hideReferenceArea ?
                <Button className={classes.toggleReferenceArea} onClick={() => this.handleToggleReferenceArea()}>Show Reference Area</Button> :
                <Button className={classes.toggleReferenceArea} onClick={() => this.handleToggleReferenceArea()}>Hide Reference Area</Button> }
            </div>
          </div>
          <div className={classes.content}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={snapshots} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <Line type="monotone" dataKey="skew" stroke="#8884d8" />
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                <XAxis dataKey="_snapshotTimestamp" type="number" scale="time" domain={['auto', 'auto']} tick={this.renderCustomAxisTick} />
                <YAxis label={
                  <Text x={0} y={0} dx={20} dy={170} offset={0} angle={-90}>skew (ms)</Text>
                } />
                <Tooltip content={this.renderCustomTooltip} />
                <defs>
                  <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={off[0]} stopColor="red" stopOpacity={1} />
                    <stop offset={off[0]} stopColor="green" stopOpacity={1} />
                    <stop offset={off[1]} stopColor="green" stopOpacity={1} />
                    <stop offset={off[1]} stopColor="red" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="skew" stroke="#000" fill="url(#splitColor)" />
                { !hideReferenceArea && seqSnapshots.map((s, i, arr) => {
                    const s0 = s[0]
                    const s1 = (i < arr.length - 1) ? arr[i+1][0] : s[s.length - 1]
                    const stateHits = Object.keys(colorMap).filter(name => s0.state.name.includes(name))
                    const color = (stateHits.length > 0) ? colorMap[stateHits[0]] : colorMap['__custom']
                    const opacity = (stateHits.length > 0) ? referenceAreaOpacities[stateHits[0]] : referenceAreaOpacities['__custom']
                    return (
                      <ReferenceArea
                        key={s0._key}
                        className={classes.referenceArea}
                        x1={s0._snapshotTimestamp}
                        x2={s1._snapshotTimestamp}
                        ifOverflow="extendDomain"
                        opacity={opacity}
                        fill={color} />
                    )
                }) }
                <Legend content={this.renderCustomLegend} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Paper>
      </div>
    )
  }
}

MetricsView.propTypes = {
  classes: PropTypes.object.isRequired,
  className: PropTypes.string,
  log: PropTypes.array.isRequired,
}

export default withStyles(styles)(MetricsView)
