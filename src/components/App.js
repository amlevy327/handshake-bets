import React, { Component } from 'react'
import './App.css'
import Navbar from './Navbar'
import { connect } from 'react-redux'

class App extends Component {
  componentWillMount() {
    this.loadBlockchainData(this.props.dispatch)
  }

  async loadBlockchainData(dispatch) {
  }

  render() {
    return (
      <div>
        <Navbar />
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
  }
}

export default connect(mapStateToProps)(App);