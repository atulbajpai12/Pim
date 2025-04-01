/*

Copyright 2020-2022 Atle Solbakken <atle.solbakken@gmail.com>

This code may be used freely in systems run for, at or
by Posten Norge AS. The first time the code, or a part of it,
is being used for a specific task, the author must be notified
about this.

The code may be changed or modified as long as a copy
of the modified version is sent to the author.

This notice must not be removed or modified.

*/

function LBSWeightIndicatorManualPopupCommand(weight) {
	this.weight = weight;

	this.init = function(commands) {
		if (commands.getByInstance(LBSWeightIndicatorManualPopupCommand) != null) {
			return null;
		}
		return this;
	};

	this.run = function(state, dispatch, elements) {
		const action = function(dispatch){ return() => {
			dispatch({type: 'cancel-command-by-instance', data: LBSWeightIndicatorManualPopupCommand});
		}}(dispatch);
		elements.push(Popup(
			() => {
				return [
					e("div", {key: "header", className: "popup_header"}, l("Manual weight")),
					e("div", {key: "keypad"}, this.weight.renderPopup(action))
				];
			},
			function(dispatch, command){return () => {
				dispatch({type: 'cancel-command-by-instance', data: LBSWeightIndicatorManualPopupCommand});
			}}(dispatch, this),
			false /* No close button */
		));
		return true;
	};
};

function LBSWeightIndicator (server_ip, reset_init = () => {}, display_grams = false) {
	this.server_ip = server_ip;
	this.display_grams = display_grams;
	this.scale_ip = null;
	this.scale_port = null;

	this.indicator_ref = React.createRef();

	this.weight_ws = null;

	this.weight_last_time = 0;
	this.weight_last_reading = null;
	this.weight_manual = 0;

	this.stable_weight = 0;

	this.interval = null;

	this.reading_expiration_ms = 1000;
	this.manual_weight_expiration_ms = 10000;

	this.reset = function() {
		this.weight_manual = 0;
	};

	reset_init(this.reset.bind(this));

	this.isStable = function() {
		return this.stable_weight > 0 || this.weight_manual > 0;
	};

	this.getWeight = function() {
		return this.isStable() ? this.weight_manual > 0 ? this.weight_manual : this.stable_weight : 0;
	};

	this.sendManualWeight = function() {
		if (this.weight_manual > 0) {
			// Use scale IP so that the manual weight works with
			// other scanners on the measuringpoint.
			var url = "http://" + this.server_ip + ":8000/" +
				"?ip=" + this.scale_ip +
				"&port=" + this.scale_port +
				"&reading_stable=" + this.weight_manual;
			fetch(url);
		}
	};

	this.start = function (scale_ip, scale_port) {
		if (this.scale_ip == scale_ip && this.scale_port == scale_port) {
			return;
		}

		this.scale_ip = scale_ip;
		this.scale_port = scale_port;

		if (this.weight_ws != null) {
			this.weight_ws.onclose = null;
			this.weight_ws.close();
		}

		this.weightWsInit();

		if (this.interval != null) {
			clearInterval(this.interval);
		}

		this.interval = setInterval(function(weight){ return () => {
			weight.sendManualWeight();
			weight.weightReadingPeriodic();
		}}(this), 333);
	};

	this.renderPopup = function (action) {
		return KeyboardKeypadRender(function(weight){return (value) => {
			if (value == "")
				value = null;
			weight.weight_manual = weight.display_grams ? value / 1000 : value;
			action();
		}}(this), 1);
	};

	this.render = function (state, dispatch) {
		return e("div", {
			key: "weight_indicator",
			className: "weight_indicator inputbox",
			ref: this.indicator_ref,
			onMouseUp: function(dispatch, weight){return () => {
				weight.weight_manual = 0;
				dispatch({type: 'command', data: new LBSWeightIndicatorManualPopupCommand(weight)});
			}}(dispatch, this),
			onMouseDown: (e) => {e.stopPropagation()}
		}, "-");
	};

	this.weightCheckManualExpired = function () {
		var time_now = Date.now();
		if (time_now - this.weight_last_time >= this.manual_weight_expiration_ms) {
			this.weight_manual = 0;
		}
	};

	this.weightCheckOld = function () {
		var time_now = Date.now();

		if (time_now - this.weight_last_time >= this.reading_expiration_ms) {
			const indicator = this.indicator_ref.current;

			if (indicator == null) {
				return;
			}

			indicator.style.backgroundColor = "#fff";
			indicator.innerText = "-";

			this.stable_weight = 0;
			this.weight_last_reading = null;
		}
	};

	this.weightReadingUpdate = function (reading, is_manual=false) {
		const indicator = this.indicator_ref.current;

		this.stable_weight = 0;

		if (indicator == null) {
			return;
		}

		var color = "yellow";
		var time_now = Date.now();

		if (is_manual) {
			color = "#00f";

			if (this.weight_last_reading == reading) {
			}
			else {
				this.weight_last_time = time_now;
				this.weight_last_reading = reading;
			}
		}
		else {
			if (Math.max(this.weight_last_reading, reading) - Math.min(this.weight_last_reading, reading) < 0.1) {
				if (this.weight_last_equal_time == 0) {
					this.weight_last_equal_time = time_now;;
				}
				else if (time_now - this.weight_last_equal_time >= 1000) {
					color = "#0a0";
					this.stable_weight = reading;
				}
			}
			else {
				this.weight_last_equal_time = 0;
			}

			if (reading < this.weight_reading_green_minimum) {
				color = "#fff";
			}

			this.weight_last_time = time_now;
			this.weight_last_reading = reading;
		}

		if (this.display_grams) {
			var new_text_value = Math.round(reading * 1000);
			var new_text = "" + new_text_value.toFixed(0) + " g";
		}
		else {
			var new_text_value = (Math.round(reading * 10) / 10);
			var new_text = "" + new_text_value.toFixed(1) + " kg";
		}
	
		indicator.innerText = new_text;
		indicator.style.backgroundColor = color;
	};

	this.weightWsInit = function () {
		var weight_indicator = this;

		this.weight_ws = new WebSocket("ws://" + this.server_ip + ":8002/poll");

		this.weight_ws.onopen = function(event) {
		};

		this.weight_ws.onclose = function(weight_indicator){return function(event) {
			weight_indicator.weightWsInit();
		};}(weight_indicator);

		this.weight_ws.onmessage = function(weight_indicator){return function(event) {
			try {
				var json = JSON.parse(event.data);
				for (let i = 0; i < json.length; i++) {
					weight_indicator.weightReadingUpdate(json[i].reading, false);
				}
			}
			catch (e) {
			}
		};}(weight_indicator);
	};

	this.weightWsPoll = function() {
		try {
			this.weight_ws.send("lbs/weight-reading/" + this.scale_ip + ":" + this.scale_port);
		}
		catch (e) {
		}
	};

	this.weightReadingPeriodic = function() {
		if (this.weight_manual > 0) {
			this.weightReadingUpdate(this.weight_manual, true);
			this.weightCheckManualExpired();
		}
		else {
			this.weightWsPoll();
			this.weightCheckOld();
		}
	};
}

function LBSWeightRenderImageButton (action = function(){}, text = null, image_url = null) {
	return e("button", {key: text, onMouseUp: action}, [
		e("span", {key: "legend"}, text),
		e("img", {key: "image", src: image_url }),
		e("div", {key: "overlay", onMouseUp: action })
	]);
}

function LBSWeightTareType(text, preceder = null) {
	this.text = text;
	this.preceder = preceder;
	this.follower = null;
	this.value = null;

	if (preceder != null)
		preceder.follower = this;

	this.reset = function(no_follow = false) {
		this.value = null;
		if (!no_follow && this.follower != null)
			this.follower.reset();
	};

	this.get = function() {
		return this.value;
	};

	this.precederOK = function() {
		return this.preceder == null || this.preceder.get() != null;
	};

	this.renderButton = function(action, get_image_url) {
		const image_url = this.value == null ? null : get_image_url(this.value);

		return e("button", {
			key: this.text,
			disabled: !this.precederOK(),
			onMouseUp: function(button){return () => {
				action(button)
			}}(this)
		}, [
			e("span", {key: "legend"}, this.value != null ? this.value : l(this.text)),
			image_url != null ? e("img", {key: "image", src: image_url}) : null,
			e("div", {key: "overlay"})
		]);
	};

	this.renderPad = function(buttons = [], get_image_url = (image_id) => { return ""; }, action = (image_id) => {}) {
		const elements = [];

		for (let i = 0; i < buttons.length; i++) {
			const image_id = buttons[i];
			const action_button = function(image_id, action, tare_type){ return function() {
				if (action(image_id)) {
					tare_type.value = image_id;
				}
			}}(image_id, action, this)
			elements.push(LBSWeightRenderImageButton (action_button, image_id, get_image_url(image_id)));
		}

		return e("div", {className: "weight_carrier_buttons weight_image_buttons"}, elements);
	};
};

function LBSWeightCountType(text, preceder = null) {
	this.text = text;
	this.preceder = preceder;
	this.follower = null;
	this.value = null;

	if (preceder != null)
		preceder.follower = this;

	this.reset = function(no_follow = false) {
		this.value = null;
		if (!no_follow && this.follower != null)
			this.follower.reset();
	};

	this.get = function() {
		return this.value;
	};

	this.set = function(value) {
		this.value = parseInt(value);
	};

	this.precederOK = function() {
		return this.preceder == null || this.preceder.get() != null;
	};

	this.renderButton = function(action) {
		if (!this.precederOK())
			this.value = null;

		return e("button", {
			key: this.text,
			disabled: !this.precederOK(),
			onMouseUp: function(button){return () => {
				if (button.value === 0) {
					// Not allowed to change special value 0
				}
				else {
					action(button)
				}
			}}(this)
		}, [
			e("span", {key: this.text}, l(this.text)),
			this.value != null
				? e("div", {key: "value", className: "text"}, this.value)
				: [],
			e("div", {key: "overlay"})
		]);
	};

	this.renderPad = function(action) {
		return KeyboardKeypadRender(function(button){return (value) => {
			if (value == "" || value == NaN)
				value = 0;
			else
				value = parseInt(value);
			if (action(value)) {
				button.value = value;
			}
		}}(this));
	};
};

function LBSWeightTareSelectionCommand(tare_selection) {
	this.tare_selection = tare_selection;

	this.init = function(commands) {
		if (commands.getByInstance(LBSWeightTareSelectionCommand) != null) {
			return null;
		}
		return this;
	}

	this.run = function(state, dispatch, elements) {
		elements.push(Popup(
			() => {
				return this.tare_selection.renderPopup(state, dispatch);
			},
			function(dispatch, command){return () => {
				dispatch({type: 'cancel-command-by-instance', data: LBSWeightTareSelectionCommand});
			}}(dispatch, this),
			false /* No close button */
		));
		return true;
	};
};

function LBSWeightTareSelectionErrorCommand(message) {
	this.message = message;

	this.init = function(commands) {
		commands.clearByInstance(LBSWeightTareSelectionErrorCommand);
		return this;
	}

	this.run = function(state, dispatch, elements) {
		const cancel = function(dispatch, command){return () => {
			dispatch({type: 'cancel-command-by-instance', data: LBSWeightTareSelectionErrorCommand});
		}}(dispatch, this);
		elements.push(Popup(
			() => {
				return e("div", {
					className: "popup_message",
					onMouseUp: cancel
				}, this.message);
			},
			cancel,
			false /* No close button */
		));
		return true;
	};
};

function LBSWeightTareSelection(server_ip, reset_init = () => {}) {
	this.server_ip = server_ip;
	this.calculated_weight = null;
	this.active = false;

	this.type_carrier = new LBSWeightTareType("Carrier");
	this.type_content = new LBSWeightTareType("Content", this.type_carrier);
	this.type_count = new LBSWeightCountType("Count", this.type_content);

	this.rows = [];
	this.buttons_matrix = {};
	this.image_urls = {};
	this.image_details = {};

	this.scale_ip = null;
	this.scale_port = null;

	this.report_interval = null;

	this.sendTareWeight = function() {
		if (this.scale_ip == null || this.scale_port === 0 || !(this.calculated_weight > 0)) {
			return;
		}

		const carrier = this.type_carrier.get();
		const content = this.type_content.get();
		const count = this.type_count.get();

		var url = "http://" + this.server_ip + ":8000/" +
			"?ip=" + this.scale_ip +
			"&port=" + this.scale_port +
			"&reading_tare=" + (this.calculated_weight > 0 ? this.calculated_weight : 0) +
			"&reading_carrier=" + (carrier > 0 ? this.image_details[carrier]['carrier_type'] : "0") +
			"&reading_content=" + (content > 0 ? this.image_details[content]['carrier_type'] : "0") +
			"&reading_count=" + (count > 0 ? count : "0");

		fetch(url);
	}

	this.resetAll = function() {
		this.calculated_weight = null;
		this.type_carrier.reset();
	};

	this.reset = function() {
		this.calculated_weight = null;
		if (this.type_count.get() === 0) {
			this.type_content.reset();
		}
		else {
			this.type_count.reset();
		}
	};

	this.start = function (scale_ip, scale_port) {
		this.scale_ip = scale_ip;
		this.scale_port = scale_port;
	};

	reset_init(this.reset.bind(this));

	this.getImageURL = function(image_id) {
		return  this.image_urls[image_id] != undefined
			? this.image_urls[image_id]
			: ""
		;
	};

	this.fetchFinal = function (state, dispatch, api_base_url, measuringpoint_postcode_id = null, measuringpoint_id = null) {
		if (measuringpoint_postcode_id == null || measuringpoint_id == null) {
			this.buttons_matrix = {};
			this.image_urls = {};
			return;
		}

		LBSAPI_call_nobase(api_base_url + "get-carrier-buttons/" + measuringpoint_postcode_id + "/" + measuringpoint_id).then( function(state, dispatch, tare_selection, api_base_url) { return function(rows) {
			if (rows.length == 0) {
				tare_selection.buttons_matrix = {};
				tare_selection.image_urls = {};
				return;
			}

			let buttons_matrix = [];
			for (var i = 0; i < rows.length; i++) {
				const image_id = rows[i]['carrier_image_id'];
				const position_a = rows[i]['carrier_button_position_a'];

				if (buttons_matrix[position_a] == undefined) {
					buttons_matrix[position_a] = [];
				}
				buttons_matrix[position_a].push(image_id);
				
				// URL if API provides raw image
				const url_default = api_base_url + "get-carrier-image/" + image_id;

				if (tare_selection.image_urls[rows[i]['carrier_image_id']] != url_default && tare_selection.image_urls[image_id] != undefined) {
					// Download not needed
					continue;
				}

				tare_selection.image_urls[image_id] = url_default;
				tare_selection.image_details[image_id] = rows[i];

				try {
					// URL if API provides hex in JSON data (this fails if raw image is provided, which is fine)
					LBSAPI_call_nobase(api_base_url + "get-carrier-image/" + image_id).then( function(state, dispatch, tare_selection, image_id) { return function(rows) {
						if (rows.length == undefined || rows.length == 0 || rows[0]['carrier_image'] == undefined) {
							return;
						}
						tare_selection.image_urls[image_id] = "data:image/png," + rows[0]['carrier_image'].replace(/../g, function (m) {
							return "%" + m;
						});
						EngineRenderTimeout(state, dispatch);
					}}(state, dispatch, tare_selection, image_id));

					LBSAPI_call_nobase(api_base_url + "get-carrier-button-details/" + position_a + "/" + image_id).then( function(tare_selection, image_id, position_a) { return function(rows) {
						if (rows == 0) {
							return;
						}
						tare_selection.image_details[image_id] = {...tare_selection.image_details[image_id], ...rows[0]};
					}}(tare_selection, image_id, position_a));
				}
				catch (e) {
				}
			}

			if (!EngineCheckEqual(tare_selection.buttons_matrix, buttons_matrix)) {
				tare_selection.buttons_matrix = buttons_matrix;
				dispatch({type: 'render'});
			}
		}}(state, dispatch, this, api_base_url));
	};

	this.fetch = function (api_base_url, measuringpoint_postcode_id, measuringpoint_id) {
		// Dummy function
	};

	this.getImageURL = function (image_id) {
		return this.image_urls[image_id];
	};

	this.calculate = function (state, dispatch) {
		this.calculated_weight = null;

		const carrier = this.type_carrier.get();
		const content = this.type_content.get();
		const count = this.type_count.get();

		if (carrier == null || content == null || count == null) {
			return;
		}

		this.calculated_weight = (parseInt(this.image_details[carrier]['carrier_weight']) + parseInt(this.image_details[content]['carrier_weight']) * count) / 10;
	};

	this.preRender = function (state, dispatch) {
		this.fetch = function (state, dispatch, tare_selection) { return function (api_base_url, measuringpoint_postcode_id, measuringpoint_id) {
			tare_selection.fetchFinal(state, dispatch, api_base_url, measuringpoint_postcode_id, measuringpoint_id);
		}}(state, dispatch, this);

		this.calculate();

		if (this.report_interval != null) {
			clearInterval(this.report_interval);
			this.report_interval = null;
		}

		if (this.calculated_weight != null) {
			this.report_interval = setInterval(function(tare_selection){return () => {
				tare_selection.sendTareWeight();
			}}(this), 500);
		}
	};

	this.render = function (state, dispatch) {
		// Ensure weight is updated immediately in
		// the worker after a change.
		this.sendTareWeight();
	
		const button_action = function (state, dispatch, tare_selection) {
			return (button) => {
				button.reset();
				dispatch({type: 'command', data: new LBSWeightTareSelectionCommand(tare_selection)});
				dispatch({type: 'render'});
			};
		}(state, dispatch, this);

		return e("div", {
			className: "weight_tare_buttons weight_image_buttons",
			onMouseDown: (e) => { e.stopPropagation(); }
		}, [
			this.type_carrier.renderButton(button_action, this.getImageURL.bind(this)),
			e("span", {key: "plus"}, "+"),
			this.type_content.renderButton(button_action, this.getImageURL.bind(this)),
			e("span", {key: "times"}, "\u00D7"),
			this.type_count.renderButton(button_action),
			e("span", {key: "equals"}, "="),
			e("div", {key: "indicator", className: "weight_tare_indicator inputbox"}, (this.calculated_weight == null ? "-" : "" + this.calculated_weight) + " kg")
		]);
	};

	this.renderPopup = function(state, dispatch) {
		const action_carrier = function(dispatch){return () => {
			dispatch({type: "render"});
			return true;
		}}(dispatch);

		const action_content = function(dispatch, tare_selection) { return (value) => {
			const content = tare_selection.type_content.get();
			const count_max = tare_selection.image_details[value]['carrier_count_max'];

			if (count_max == 0) {
				tare_selection.type_count.set(0);
				dispatch({type: 'cancel-command-by-instance', data: LBSWeightTareSelectionCommand});
			}
			else {
				dispatch({type: "render"});
			}

			return true;
		}}(dispatch, this);

		const action_count = function(dispatch, tare_selection){return (value) => {
			const content = tare_selection.type_content.get();
			const count_min = tare_selection.image_details[content]['carrier_count_min'];
			const count_max = tare_selection.image_details[content]['carrier_count_max'];

			console.log(value);

			if (value <= 0) {
				dispatch({type: 'command', data: new LBSWeightTareSelectionErrorCommand(l("Invalid number"))});
				return false;
			}
			else if (value < count_min) {
				dispatch({type: 'command', data: new LBSWeightTareSelectionErrorCommand(l("Minimum count is") + " " + count_min)});
				return false;
			}
			else if (value > count_max) {
				dispatch({type: 'command', data: new LBSWeightTareSelectionErrorCommand(l("Maximum count is") + " " + count_max)});
				return false;
			}

			dispatch({type: 'cancel-command-by-instance', data: LBSWeightTareSelectionCommand});
			return true;
		}}(dispatch, this);

		return e("div", {key: "weight_popup_parent", className: "weight_popup_parent"}, [
			e("div", {key: "menu"}, this.render(state, dispatch)),
			e("div", {key: "pad", className: "weight_popup_pad"}, this.type_content.get() != null
				? this.type_count.renderPad(action_count)
				: this.type_carrier.get() != null
					? this.type_content.renderPad(this.buttons_matrix[1], this.getImageURL.bind(this), action_content)
					: this.type_carrier.renderPad(this.buttons_matrix[0], this.getImageURL.bind(this), action_carrier)
			)
		]);
	};

	this.popupActive = function(state) {
		return state.commands.getByInstance(LBSWeightTareSelectionCommand) != null;
	};

	this.popupShow = function (state, dispatch) {
		if (!this.popupActive(state)) {
			dispatch({type: 'command', data: new LBSWeightTareSelectionCommand(this)});
		}
	};

	this.getOrError = function(state, weight_min) {
		if (this.calculated_weight == null) {
			state.ctx(function(tare_selection){return (state, dispatch) => {
				dispatch({type: 'command', data: new LBSWeightTareSelectionErrorCommand(l("Load carrier not selected"))});
			}}(this));

			return null;
		}
		else if (this.calculated_weight > weight_min) {
			state.ctx(function(tare_selection){return (state, dispatch) => {
				dispatch({type: 'command', data: new LBSWeightTareSelectionErrorCommand(l("Tare weight exceeds weight from scale"))});
			}}(this));

			return null;
		}

		return this.calculated_weight;
	};

	this.get = function(state) {
		return this.calculated_weight;
	};
}
