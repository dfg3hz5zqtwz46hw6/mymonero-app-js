// Copyright (c) 2014-2017, MyMonero.com
//
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification, are
// permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of
//	conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list
//	of conditions and the following disclaimer in the documentation and/or other
//	materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its contributors may be
//	used to endorse or promote products derived from this software without specific
//	prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
// THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
// THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
"use strict"
//
const View = require('../../Views/View.web')
const commonComponents_tables = require('../../MMAppUICommonComponents/tables.web')
const commonComponents_forms = require('../../MMAppUICommonComponents/forms.web')
const commonComponents_navigationBarButtons = require('../../MMAppUICommonComponents/navigationBarButtons.web')
const commonComponents_tooltips = require('../../MMAppUICommonComponents/tooltips.web')
//
const WalletsSelectView = require('../../WalletsList/Views/WalletsSelectView.web')
//
const monero_utils = require('../../monero_utils/monero_cryptonote_utils_instance')
//
class ImportTransactionsModalView extends View
{
	constructor(options, context)
	{
		super(options, context) // call super before `this`
		//
		const self = this 
		self.wallet = options.wallet
		if (!self.wallet) {
			throw `${self.constructor.name} requires options.wallet`
		}
		self.setup()
	}
	setup()
	{
		const self = this
		self.isSubmitButtonDisabled = false
		self.setup_views()
		self.startObserving()
	}
	setup_views()
	{
		const self = this
		self._setup_self_layer()
		self._setup_informationalHeaderLayer() // above the validation layer
		self._setup_validationMessageLayer()
		self._setup_form_containerLayer()
		// self.DEBUG_BorderChildLayers()
	}
	_setup_self_layer()
	{
		const self = this
		const layer = self.layer
		layer.style.webkitUserSelect = "none" // disable selection here but enable selectively
		//
		layer.style.position = "relative"
		layer.style.boxSizing = "border-box"
		layer.style.width = "100%"
		layer.style.height = "100%"
		layer.style.padding = "0" // actually going to change paddingTop in self.viewWillAppear() if navigation controller
		layer.style.overflowY = "scroll"
		//
		layer.style.backgroundColor = "#272527" // so we don't get a strange effect when pushing self on a stack nav view
		//
		layer.style.color = "#c0c0c0" // temporary
		//
		layer.style.wordBreak = "break-all" // to get the text to wrap
	}
	_setup_informationalHeaderLayer()
	{
		const self = this
		const layer = document.createElement("div")
		layer.style.width = "100%"
		layer.style.textAlign = "center"
		layer.style.marginTop = "18px"
		layer.style.paddingBottom = "10px" // for spacing
		layer.style.color = "#9E9C9E"
		layer.style.fontSize = "13px"
		layer.style.fontFamily = self.context.themeController.FontFamily_sansSerif()
		layer.innerHTML = "Loading…"
		self.informationalHeaderLayer = layer
		self.layer.appendChild(layer)
	}
	_setup_validationMessageLayer()
	{ // validation message
		const self = this
		const layer = commonComponents_tables.New_inlineMessageDialogLayer(self.context, "")
		layer.style.width = "calc(100% - 48px)"
		layer.style.marginLeft = "24px"
		layer.ClearAndHideMessage()
		self.validationMessageLayer = layer
		self.layer.appendChild(layer)				
	}
	_setup_form_containerLayer()
	{
		const self = this
		const containerLayer = document.createElement("div")
		self.form_containerLayer = containerLayer
		{
			self._setup_form_walletSelectLayer()
			{
				const table = document.createElement("table")
				table.style.width = "100%"
				const tr_1 = document.createElement("tr")
				self._setup_form_amountInputLayer(tr_1)
				table.appendChild(tr_1)
				self.form_containerLayer.appendChild(table)
			}
			self._setup_form_addressInputLayer() // this will set up the 'resolving' activity indicator
			self._setup_form_manualPaymentIDInputLayer()
		}
		self.layer.appendChild(containerLayer)
	}
	_setup_form_walletSelectLayer()
	{
		const self = this
		const div = commonComponents_forms.New_fieldContainerLayer()
		{
			const labelLayer = commonComponents_forms.New_fieldTitle_labelLayer("FROM", self.context)
			div.appendChild(labelLayer)
			self.walletSelectLabelLayer = labelLayer
			//
			const view = new WalletsSelectView({}, self.context)
			self.walletSelectView = view
			const valueLayer = view.layer
			div.appendChild(valueLayer)
		}
		self.form_containerLayer.appendChild(div)
	}
	__styleInputAsDisabled(inputLayer)
	{
		const self = this
		inputLayer.style.boxShadow = "none"
		inputLayer.style.backgroundColor = "#383638"
		inputLayer.style.color = "#7c7a7c"
		inputLayer.style.cursor = "default"
		inputLayer.style.webkitUserSelect = "none" // as we have the COPY btns
	}
	_setup_form_amountInputLayer(tr)
	{ 
		const self = this
		const pkg = commonComponents_forms.New_AmountInputFieldPKG(
			self.context,
			"XMR", // TODO: grab, update from selected wallet
			function()
			{ // enter btn pressed
				self._tryToGenerateSend()
			}
		)		
		const div = pkg.containerLayer
		div.style.paddingTop = "2px"
		const labelLayer = pkg.labelLayer
		labelLayer.style.marginTop = "0"
		self.amountInputLayer = pkg.valueLayer
		self.amountInputLayer.disabled = true
		self.__styleInputAsDisabled(self.amountInputLayer)
		//
		const td = document.createElement("td")
		td.style.width = "100px"
		td.style.verticalAlign = "top"
		td.appendChild(div)
		tr.appendChild(td)
	}
	_setup_form_addressInputLayer()
	{ // Request funds from sender
		const self = this
		const div = commonComponents_forms.New_fieldContainerLayer()
		div.style.paddingTop = "22px"
		//
		const labelLayer = commonComponents_forms.New_fieldTitle_labelLayer("TO", self.context)
		labelLayer.style.margin = "0 0 8px 8px"
		labelLayer.style.float = "left"
		labelLayer.style.display = "block"
		div.appendChild(labelLayer)
		{ // right
			// copying both html and plaintext
			const buttonLayer = commonComponents_tables.New_copyButton_aLayer(
				self.context,
				"", // for now
				true,
				self.context.pasteboard
			)
			buttonLayer.style.margin = "-1px 0 0 0"
			buttonLayer.style.float = "right"
			self.copyButtonLayerFor_addressInput = buttonLayer
			div.appendChild(buttonLayer)
		}
		div.appendChild(commonComponents_tables.New_clearingBreakLayer())
		
		// {
		// 	const tooltipText = ""
		// 	const view = commonComponents_tooltips.New_TooltipSpawningButtonView(tooltipText, self.context)
		// 	const layer = view.layer
		// 	labelLayer.appendChild(layer) // we can append straight to labelLayer as we don't ever change its innerHTML
		// }
		//
		const layer = commonComponents_forms.New_fieldValue_textInputLayer(
			self.context,
			{
				placeholderText: "import.mymonero.com"
			}
		)
		self.addressInputLayer = layer
		layer.disabled = true
		self.__styleInputAsDisabled(layer)
		div.appendChild(layer)
		self.form_containerLayer.appendChild(div)
	}
	_setup_form_manualPaymentIDInputLayer()
	{
		const self = this
		const div = commonComponents_forms.New_fieldContainerLayer()
		div.style.paddingTop = "4px"
		{
			const labelLayer = commonComponents_forms.New_fieldTitle_labelLayer("PAYMENT ID", self.context)
			labelLayer.style.margin = "0 0 8px 8px"
			labelLayer.style.float = "left"
			labelLayer.style.display = "block"
			div.appendChild(labelLayer)
			{ // right
				// copying both html and plaintext
				const buttonLayer = commonComponents_tables.New_copyButton_aLayer(
					self.context,
					"", // for now
					true,
					self.context.pasteboard
				)
				buttonLayer.style.margin = "-1px 0 0 0"
				buttonLayer.style.float = "right"
				self.copyButtonLayerFor_paymentID = buttonLayer
				div.appendChild(buttonLayer)
			}
			div.appendChild(commonComponents_tables.New_clearingBreakLayer())
			//
			const valueLayer = commonComponents_forms.New_fieldValue_textInputLayer(self.context, {
				placeholderText: "Loading…"
			})
			self.manualPaymentIDInputLayer = valueLayer
			valueLayer.disabled = true
			self.__styleInputAsDisabled(valueLayer)
			div.appendChild(valueLayer)
		}
		self.form_containerLayer.appendChild(div)
	}
	//
	startObserving()
	{
		const self = this
	}
	//
	// Lifecycle - Teardown - Overrides
	TearDown()
	{
		const self = this
		self.walletSelectView.TearDown() // important! so it stops observing…
		self.stopObserving()
		self.cancelAny_requestHandle_for_importRequestInfoAndStatus()
		super.TearDown()
	}
	cancelAny_requestHandle_for_importRequestInfoAndStatus()
	{
		const self = this
		//
		let req = self.requestHandle_for_importRequestInfoAndStatus
		if (typeof req !== 'undefined' && req !== null) {
			console.log("💬  Aborting requestHandle_for_importRequestInfoAndStatus")
			req.abort()
		}
		self.requestHandle_for_importRequestInfoAndStatus = null
	}
	stopObserving()
	{
		const self = this
	}
	//
	// Runtime - Accessors - Navigation
	Navigation_Title()
	{
		return "Import Transactions"
	}
	Navigation_New_LeftBarButtonView()
	{
		const self = this
		const view = commonComponents_navigationBarButtons.New_LeftSide_CancelButtonView(self.context)
		self.leftBarButtonView = view
		const layer = view.layer
		layer.addEventListener(
			"click",
			function(e)
			{
				e.preventDefault()
				self.dismissView()
				return false
			}
		)
		return view
	}
	Navigation_New_RightBarButtonView()
	{
		const self = this
		const view = commonComponents_navigationBarButtons.New_RightSide_SaveButtonView(self.context)
		self.rightBarButtonView = view
		const layer = view.layer
		layer.innerHTML = "Send"
		layer.addEventListener(
			"click",
			function(e)
			{
				e.preventDefault()
				if (self.isSubmitButtonDisabled !== true) { // button is enabled
					self._tryToGenerateSend()
				}
				return false
			}
		)
		return view
	}
	//
	// Imperatives - Modal
	dismissView()
	{
		const self = this
		const modalParentView = self.navigationController.modalParentView
		setTimeout(function()
		{ // just to make sure the PushView is finished
			modalParentView.DismissTopModalView(true)
		})
	}
	// Runtime - Imperatives - Submit button enabled state
	//
	disable_submitButton()
	{
		const self = this
		if (self.isSubmitButtonDisabled !== true) {
			self.isSubmitButtonDisabled = true
			self.rightBarButtonView.SetEnabled(false)
		}
	}
	enable_submitButton()
	{
		const self = this
		if (self.isSubmitButtonDisabled !== false) {
			self.isSubmitButtonDisabled = false
			self.rightBarButtonView.SetEnabled(true)
		}
	}
	//
	// Runtime - Imperatives - Element config
	_dismissValidationMessageLayer()
	{
		const self = this
		self.validationMessageLayer.ClearAndHideMessage() 
	}
	//
	// Runtime - Imperatives - Send-transaction generation
	_tryToGenerateSend()
	{
		const self = this
		if (self.isSubmitButtonDisabled) {
			console.warn("⚠️  Submit button currently disabled. Bailing.")
			return
		}
		{ // disable form elements
			self.disable_submitButton()
			self.isFormDisabled = true
			//
			self.walletSelectView.SetEnabled(false)
		}
		{
			self._dismissValidationMessageLayer()
		}
		function _reEnableFormElements()
		{
			self.isFormDisabled = false
			//
			self.enable_submitButton() 
			self.walletSelectView.SetEnabled(true)
		}
		function _trampolineToReturnWithValidationErrorString(errStr)
		{ // call this anytime you want to exit this method before complete success (or otherwise also call _reEnableFormElements)
			self.validationMessageLayer.SetValidationError(errStr)
			_reEnableFormElements()
		}
		//
		const wallet = self.walletSelectView.CurrentlySelectedRowItem
		{
			if (typeof wallet === 'undefined' || !wallet) {
				_trampolineToReturnWithValidationErrorString("Please create a wallet to send Monero.")
				return
			}
		}
		const target_address = self.addressInputLayer.value
		const payment_id = self.manualPaymentIDInputLayer.value
		const mixin_int = 6 // reasonable? use 12 instead?
		const amount_Number = parseFloat(self.amountInputLayer.value)
		{
			self.validationMessageLayer.SetValidationError(`Sending ${amount_Number} XMR…`)
		}
		__proceedTo_generateSendTransactionWith(
			wallet, // FROM wallet
			target_address, // TO address
			payment_id,
			amount_Number,
			mixin_int
		)
		function __proceedTo_generateSendTransactionWith(
			sendFrom_wallet,
			target_address,
			payment_id,
			amount_Number,
			mixin_int
		)
		{
			const sendFrom_address = sendFrom_wallet.public_address
			sendFrom_wallet.SendFunds(
				target_address,
				amount_Number,
				mixin_int,
				payment_id,
				function(
					err,
					currencyReady_targetDescription_address,
					sentAmount,
					final__payment_id,
					tx_hash,
					tx_fee
				)
				{
					if (err) {
						_trampolineToReturnWithValidationErrorString(typeof err === 'string' ? err : err.message)
						return
					}
					self.validationMessageLayer.SetValidationError(`Sent.`)
					// finally, clean up form 
					setTimeout(
						function()
						{
							self._dismissValidationMessageLayer()
							// Now dismiss
							self.dismissView()
						},
						500 // after the navigation transition just above has taken place
					)
					// and fire off a request to have the wallet get the latest (real) tx records
					setTimeout(
						function()
						{
							sendFrom_wallet.hostPollingController._fetch_transactionHistory() // TODO: maybe fix up the API for this
						}
					)
				}
			)
		}
	}
	//
	// Runtime - Delegation - Navigation/View lifecycle
	viewWillAppear()
	{
		const self = this
		super.viewWillAppear()
		if (typeof self.navigationController !== 'undefined' && self.navigationController !== null) {
			self.layer.style.paddingTop = `${self.navigationController.NavigationBarHeight()}px`
		}
	}
	viewDidAppear()
	{
		const self = this
		super.viewDidAppear()
		//
		if (self.requestHandle_for_importRequestInfoAndStatus == null || typeof self.requestHandle_for_importRequestInfoAndStatus === 'undefined') {
			const requestHandle = self.context.hostedMoneroAPIClient.ImportRequestInfoAndStatus(
				self.wallet.public_address,
				self.wallet.private_keys.view,
				function(
					err, 
					payment_id, 
					payment_address, 
					import_fee__JSBigInt, 
					feeReceiptStatus
				)
				{
					self.requestHandle_for_importRequestInfoAndStatus = null // reset
					//
					if (err) {
						self.validationMessageLayer.SetValidationError(err.toString())
						self.informationalHeaderLayer.innerHTML = "&nbsp;" // clear for now
						return
					}
					const raw_formattedMoney = monero_utils.formatMoney(import_fee__JSBigInt)
					{
						self.informationalHeaderLayer.innerHTML = `This requires a one-time import fee of ${raw_formattedMoney} XMR`
						//
						const tooltipText = "Importing your wallet means the server will scan the entire Monero blockchain for your wallet's past transactions, then stay up-to-date.<br/><br/>As this process is very server-intensive, to prevent spam, import is triggered by sending a fee with the specific payment ID below to import.mymonero.com."
						const view = commonComponents_tooltips.New_TooltipSpawningButtonView(tooltipText, self.context)
						const layer = view.layer
						self.informationalHeaderLayer.appendChild(layer) // we can append straight to layer as we don't ever change its innerHTML after this
					}
					{
						self.addressInputLayer.value = payment_address
						self.copyButtonLayerFor_addressInput.Component_SetValue(payment_address)
						//
						self.manualPaymentIDInputLayer.value = payment_id
						self.copyButtonLayerFor_paymentID.Component_SetValue(payment_id)
						//
						var amountStr = raw_formattedMoney
						if (amountStr.indexOf(".") == -1) {
							amountStr += '.00'
						}
						amountStr = '0' + amountStr
						self.amountInputLayer.value = amountStr
					}
					{
						// const command = `transfer 3 import.mymonero.com ${import_fee__JSBigInt} ${payment_id}`
						const tooltipText = "For convenience you may send the fee from MyMonero here, or the official CLI or GUI tools, or any other Monero wallet.<br/><br/>Please be sure to use the exact payment ID below, so the server knows which wallet to import."
						const view = commonComponents_tooltips.New_TooltipSpawningButtonView(tooltipText, self.context)
						const layer = view.layer
						self.walletSelectLabelLayer.appendChild(layer) // we can append straight to layer as we don't ever change its innerHTML after this
					}
					self.validationMessageLayer.SetValidationError("")
					self.enable_submitButton()
					//
					// TODO: output the fee receipt status somehow…?
					console.log("fee receipt status is…", feeReceiptStatus)
				}
			)
			self.requestHandle_for_importRequestInfoAndStatus = requestHandle
		}
	}
}
module.exports = ImportTransactionsModalView