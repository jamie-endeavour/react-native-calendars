// @flow
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import PropTypes from 'prop-types';
import populateEvents from './Packer';
import React from 'react';
import moment from 'moment';
import _ from 'lodash';
import styleConstructor from './style';

const LEFT_MARGIN = 60 - 1;
// const RIGHT_MARGIN = 10
// const CALENDER_HEIGHT = 2400;
// const EVENT_TITLE_HEIGHT = 15
const TEXT_LINE_HEIGHT = 17;
// const MIN_EVENT_TITLE_WIDTH = 20
// const EVENT_PADDING_LEFT = 4

function range(from, to) {
  return Array.from(Array(to), (_, i) => from + i);
}

let {width: dimensionWidth} = Dimensions.get('window');

export default class Timeline extends React.PureComponent {
  static propTypes = {
    start: PropTypes.number,
    end: PropTypes.number,
    blockTapped: PropTypes.func,
    eventTapped: PropTypes.func,
    format24h: PropTypes.bool,
    events: PropTypes.arrayOf(
      PropTypes.shape({
        start: PropTypes.string.isRequired,
        end: PropTypes.string.isRequired,
        title: PropTypes.string,
        summary: PropTypes.string.isRequired,
        color: PropTypes.string,
      }),
    ).isRequired,
  };

  static defaultProps = {
    start: 0,
    end: 24,
    events: [],
    format24h: true,
  };

  constructor(props) {
    super(props);
    const {start, end} = this.props;
    this.calendarHeight = (end - start) * 100;
    this.styles = styleConstructor(props.styles, this.calendarHeight);
    const width = dimensionWidth - LEFT_MARGIN;
    const packedEvents = populateEvents(props.events, width, start);
    let initPosition =
      _.min(_.map(packedEvents, 'top')) - this.calendarHeight / (end - start);
    const verifiedInitPosition = initPosition < 0 ? 0 : initPosition;
    this.state = {
      _scrollY: verifiedInitPosition,
      packedEvents,
      refreshing: false,
    };
  }

  UNSAFE_componentWillReceiveProps({events, start = 0}) {
    const width = dimensionWidth - LEFT_MARGIN;
    this.setState({
      packedEvents: populateEvents(events, width, start),
    });
  }

  componentDidMount() {
    this.props.scrollToFirst && this.scrollToFirst();
  }

  scrollToFirst() {
    setTimeout(() => {
      if (this.state && this.state._scrollY && this._scrollView) {
        this._scrollView.scrollTo({
          x: 0,
          y: this.state._scrollY,
          animated: true,
        });
      }
    }, 1);
  }

  _renderLines() {
    const {format24h, start = 0, end = 24} = this.props;
    const offset = this.calendarHeight / (end - start);

    const EVENT_DIFF = 20;

    return range(start, end + 1).map((i, index) => {
      let timeText;

      if (i < 10) {
        timeText = !format24h ? `0${i} AM` : `0${i}:00`;
      } else if (i >= 10 && i < 12) {
        timeText = !format24h ? `${i} AM` : `${i}:00`;
      } else if (i === 12) {
        timeText = !format24h ? `${i} PM` : `${i}:00`;
      } else if (i === 24) {
        timeText = !format24h ? '12 AM' : '23:59';
      } else {
        timeText = !format24h ? `${i - 12} PM` : `${i}:00`;
      }
      return [
        <Text
          key={`timeLabel${i}`}
          style={[this.styles.timeLabel, {top: offset * index - 6}]}>
          {timeText}
        </Text>,

        <TouchableOpacity
          key={`line${i}`}
          onPress={() => {
            if (this.props.blockTapped) this.props.blockTapped(timeText);
          }}
          style={[
            {
              top: offset * index,
              width: dimensionWidth - EVENT_DIFF,
              zIndex: Platform.OS === 'android' ? 1 : null,
            },
            this.styles.line,
            {
              position: 'absolute',
              minHeight: 50,
              flex: 1,
              opacity: 1,
              backgroundColor: 'rgba(255, 255, 255, 0)',
              borderTopWidth: 1,
              borderTopColor: '#b1b1b1',
            },
          ]}>
          <View />
        </TouchableOpacity>,

        <TouchableOpacity
          onPress={() => {
            let blockTimeText;
            if (i < 10) {
              blockTimeText = !format24h ? `0${i}:30 AM` : `0${i}:30`;
            } else if (i >= 10 && i < 12) {
              blockTimeText = !format24h ? `${i}:30 AM` : `${i}:30`;
            } else if (i === 12) {
              blockTimeText = !format24h ? `${i}:30 PM` : `${i}:30`;
            } else if (i === 24) {
              blockTimeText = !format24h ? '12:30 AM' : '23:30';
            } else {
              blockTimeText = !format24h ? `${i - 12}:30 PM` : `${i}:30`;
            }

            if (this.props.blockTapped) this.props.blockTapped(blockTimeText);
          }}
          key={`lineHalf${i}`}
          style={[
            {
              top: offset * (index + 0.5),
              width: dimensionWidth - EVENT_DIFF,
              zIndex: Platform.OS === 'android' ? 1 : null,
            },
            this.styles.line,
            {
              position: 'absolute',
              minHeight: 50,
              flex: 1,
              opacity: 1,
              backgroundColor: 'rgba(255, 255, 255, 0)',
              borderTopWidth: 1,
              borderTopColor: '#b1b1b1',
            },
          ]}>
          <View />
        </TouchableOpacity>,
      ];
    });
  }

  _onRefresh = () => {
    if (this.props.refreshCallback) {
      this.props.refreshCallback();
    }
  };

  _onEventTapped(event) {
    this.props.eventTapped(event);
  }

  _renderEvents() {
    const {packedEvents} = this.state;
    let events = packedEvents.map((event, i) => {
      const style = {
        left: event.left,
        height: event.height,
        width: event.width,
        top: event.top,
        backgroundColor: event.color ? event.color : '#add8e6',
      };

      // Fixing the number of lines for the event title makes this calculation easier.
      // However it would make sense to overflow the title to a new line if needed
      const numberOfLines = Math.floor(event.height / TEXT_LINE_HEIGHT);
      const formatTime = this.props.format24h ? 'HH:mm' : 'hh:mm A';
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => this._onEventTapped(this.props.events[event.index])}
          key={i}
          style={[
            this.styles.event,
            style,
            {zIndex: Platform.OS === 'android' ? 2 : null},
          ]}>
          {this.props.renderEvent ? (
            this.props.renderEvent(event)
          ) : (
            <View>
              <Text numberOfLines={1} style={this.styles.eventTitle}>
                {event.title || 'Unavailable'}
              </Text>
              {numberOfLines > 1 ? (
                <Text
                  numberOfLines={numberOfLines - 1}
                  style={[this.styles.eventSummary]}>
                  {event.summary || ' '}
                </Text>
              ) : null}
              {numberOfLines > 2 ? (
                <Text style={this.styles.eventTimes} numberOfLines={1}>
                  {moment(event.start).utc().format(formatTime)} -{' '}
                  {moment(event.end).utc().format(formatTime)}
                </Text>
              ) : null}
            </View>
          )}
        </TouchableOpacity>
      );
    });

    return (
      <View>
        <View style={{marginLeft: LEFT_MARGIN}}>{events}</View>
      </View>
    );
  }

  render() {
    return (
      <ScrollView
        style={{paddingTop: 40}}
        refreshControl={
          this.props.refreshCallback ? (
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this._onRefresh}
            />
          ) : null
        }
        ref={(ref) => (this._scrollView = ref)}
        contentContainerStyle={[
          this.styles.contentStyle,
          {width: dimensionWidth},
        ]}>
        {this._renderLines()}
        {this._renderEvents()}
        {/* {this._renderRedLine()} */}
      </ScrollView>
    );
  }
}
